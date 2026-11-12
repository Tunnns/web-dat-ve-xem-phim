import mongoose from 'mongoose';
import Combo from '../models/Combo';
import ImportReceipt from '../models/ImportReceipt';
import Ticket from '../models/Ticket';
import { AppError } from '../utils/appError';

export interface InventoryFilters {
  startDate?: string;
  endDate?: string;
  comboId?: string;
  supplier?: string;
}

export interface StockFilters {
  search?: string;
  lowStockOnly?: boolean;
}

export interface CreateImportReceiptInput {
  importDate?: string | Date;
  supplier?: string;
  note?: string;
  items: Array<{
    comboId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export interface ImportReceiptActor {
  userId?: string;
  userName?: string;
}

interface NormalizedImportItem {
  comboId: string;
  name: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

/**
 * Tạo điều kiện lọc theo khoảng ngày cho ngày nhập kho.
 */
const buildImportDateQuery = (filters: InventoryFilters): Record<string, Date> | null => {
  if (!filters.startDate && !filters.endDate) return null;

  const dateQuery: Record<string, Date> = {};

  if (filters.startDate) {
    const start = new Date(filters.startDate);
    if (Number.isNaN(start.getTime())) {
      throw new AppError('Ngày bắt đầu không hợp lệ', 400);
    }
    start.setHours(0, 0, 0, 0);
    dateQuery.$gte = start;
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    if (Number.isNaN(end.getTime())) {
      throw new AppError('Ngày kết thúc không hợp lệ', 400);
    }
    end.setHours(23, 59, 59, 999);
    dateQuery.$lte = end;
  }

  return dateQuery;
};

/**
 * Sinh mã phiếu nhập dạng PNK-YYYYMMDD-001.
 */
const generateReceiptCode = async (importDate: Date): Promise<string> => {
  const year = importDate.getFullYear();
  const month = String(importDate.getMonth() + 1).padStart(2, '0');
  const day = String(importDate.getDate()).padStart(2, '0');
  const prefix = `PNK-${year}${month}${day}-`;

  const lastReceipt = await ImportReceipt.findOne({
    code: { $regex: `^${prefix}` },
  })
    .sort({ code: -1 })
    .select('code')
    .lean();

  const lastNumber = lastReceipt?.code
    ? Number(lastReceipt.code.slice(prefix.length))
    : 0;
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

/**
 * Kiểm tra và chuẩn hóa danh sách combo trong phiếu nhập.
 * Trả về snapshot tên combo + thành tiền từng dòng.
 */
const normalizeImportItems = async (
  rawItems: CreateImportReceiptInput['items']
): Promise<NormalizedImportItem[]> => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new AppError('Phiếu nhập phải có ít nhất 1 combo', 400);
  }

  const comboIds = new Set<string>();

  for (const raw of rawItems) {
    const comboId = String(raw?.comboId || '');
    if (!mongoose.Types.ObjectId.isValid(comboId)) {
      throw new AppError('ID combo trong phiếu nhập không hợp lệ', 400);
    }
    if (comboIds.has(comboId)) {
      throw new AppError('Mỗi combo chỉ được xuất hiện 1 lần trong phiếu nhập', 400);
    }
    comboIds.add(comboId);

    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new AppError('Số lượng nhập phải là số nguyên dương', 400);
    }

    const unitCost = Number(raw.unitCost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new AppError('Đơn giá nhập phải là số không âm', 400);
    }
  }

  const combos = await Combo.find({ _id: { $in: [...comboIds] } }).select(
    'name price costPrice stock minStock isActive'
  );
  const comboMap = new Map(combos.map((combo) => [String(combo._id), combo]));

  return rawItems.map((raw) => {
    const comboId = String(raw.comboId);
    const combo = comboMap.get(comboId);

    if (!combo) {
      throw new AppError(`Không tìm thấy combo với ID ${comboId}`, 404);
    }

    const quantity = Number(raw.quantity);
    const unitCost = Number(raw.unitCost);

    return {
      comboId,
      name: combo.name,
      quantity,
      unitCost,
      lineTotal: quantity * unitCost,
    };
  });
};

/**
 * Tạo phiếu nhập kho.
 * Cập nhật tồn kho + giá vốn bình quân gia quyền cho từng combo.
 */
export const createImportReceipt = async (
  input: CreateImportReceiptInput,
  actor?: ImportReceiptActor
) => {
  const items = await normalizeImportItems(input.items);

  const importDate = input.importDate ? new Date(input.importDate) : new Date();
  if (Number.isNaN(importDate.getTime())) {
    throw new AppError('Ngày nhập kho không hợp lệ', 400);
  }

  const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const code = await generateReceiptCode(importDate);

  // Lưu lại trạng thái cũ để rollback nếu tạo phiếu thất bại.
  const previousStates: Array<{
    comboId: string;
    stock: number;
    costPrice: number;
  }> = [];

  try {
    for (const item of items) {
      const combo = await Combo.findById(item.comboId);
      if (!combo) {
        throw new AppError(`Không tìm thấy combo "${item.name}"`, 404);
      }

      const oldStock = Number(combo.stock) || 0;
      const oldCostPrice = Number(combo.costPrice) || 0;
      const newStock = oldStock + item.quantity;

      // Bình quân gia quyền: (tồn cũ * giá vốn cũ + SL nhập * đơn giá nhập) / tồn mới
      const newCostPrice =
        newStock > 0
          ? Math.round(
              (oldStock * oldCostPrice + item.quantity * item.unitCost) / newStock
            )
          : item.unitCost;

      previousStates.push({
        comboId: item.comboId,
        stock: oldStock,
        costPrice: oldCostPrice,
      });

      combo.stock = newStock;
      combo.costPrice = newCostPrice;
      await combo.save();
    }

    return await ImportReceipt.create({
      code,
      importDate,
      supplier: input.supplier?.trim(),
      items: items.map((item) => ({
        comboId: new mongoose.Types.ObjectId(item.comboId),
        name: item.name,
        quantity: item.quantity,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
      })),
      totalAmount,
      note: input.note?.trim(),
      createdBy:
        actor?.userId && mongoose.Types.ObjectId.isValid(actor.userId)
          ? new mongoose.Types.ObjectId(actor.userId)
          : undefined,
      createdByName: actor?.userName,
    });
  } catch (error) {
    // Hoàn tác tồn kho + giá vốn nếu không tạo được phiếu nhập.
    for (const previous of previousStates.reverse()) {
      await Combo.updateOne(
        { _id: previous.comboId },
        { $set: { stock: previous.stock, costPrice: previous.costPrice } }
      );
    }
    throw error;
  }
};

/**
 * Danh sách phiếu nhập kho, lọc theo ngày / combo / nhà cung cấp.
 */
export const getImportReceipts = async (filters: InventoryFilters = {}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  const dateQuery = buildImportDateQuery(filters);
  if (dateQuery) {
    query.importDate = dateQuery;
  }

  if (filters.comboId && filters.comboId !== 'all') {
    if (!mongoose.Types.ObjectId.isValid(filters.comboId)) {
      throw new AppError('ID combo không hợp lệ', 400);
    }
    query['items.comboId'] = filters.comboId;
  }

  if (filters.supplier?.trim()) {
    query.supplier = new RegExp(filters.supplier.trim(), 'i');
  }

  return ImportReceipt.find(query).sort({ importDate: -1, createdAt: -1 });
};

export const getImportReceiptById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID phiếu nhập không hợp lệ', 400);
  }

  const receipt = await ImportReceipt.findById(id);
  if (!receipt) {
    throw new AppError('Không tìm thấy phiếu nhập kho', 404);
  }

  return receipt;
};

/**
 * Tính lại giá vốn bình quân của combo từ các phiếu nhập còn lại.
 * Dùng sau khi xóa phiếu nhập để giá vốn không bị lệch.
 */
const recalculateComboCostPrice = async (comboId: string): Promise<number | null> => {
  const receipts = await ImportReceipt.find({ 'items.comboId': comboId })
    .select('items')
    .lean();

  let totalQuantity = 0;
  let totalAmount = 0;

  for (const receipt of receipts) {
    for (const item of receipt.items) {
      if (String(item.comboId) === comboId) {
        totalQuantity += Number(item.quantity) || 0;
        totalAmount += Number(item.lineTotal) || 0;
      }
    }
  }

  if (totalQuantity <= 0) return null;

  const costPrice = Math.round(totalAmount / totalQuantity);
  await Combo.updateOne({ _id: comboId }, { $set: { costPrice } });
  return costPrice;
};

/**
 * Xóa phiếu nhập kho.
 * Chặn xóa nếu số lượng hàng của phiếu đã bán (tồn kho không đủ để trừ).
 */
export const deleteImportReceipt = async (id: string) => {
  const receipt = await getImportReceiptById(id);

  for (const item of receipt.items) {
    const combo = await Combo.findById(item.comboId);
    if (!combo) {
      throw new AppError(`Không tìm thấy combo "${item.name}"`, 404);
    }

    const currentStock = Number(combo.stock) || 0;
    if (currentStock < Number(item.quantity)) {
      throw new AppError(
        `Không thể xóa phiếu nhập: combo "${item.name}" chỉ còn tồn ${currentStock}, ` +
          `không đủ để trừ ${item.quantity} (hàng đã bán)`,
        400
      );
    }
  }

  // Xóa phiếu trước để bước tính lại giá vốn không còn tính phiếu này.
  await receipt.deleteOne();

  for (const item of receipt.items) {
    const combo = await Combo.findById(item.comboId);
    if (!combo) continue;

    combo.stock = Math.max(0, (Number(combo.stock) || 0) - Number(item.quantity));
    await combo.save();

    await recalculateComboCostPrice(String(item.comboId));
  }

  return receipt;
};

/**
 * Trừ tồn kho cho một vé đã thanh toán thành công.
 *
 * Dùng cờ `Ticket.stockDeducted` + findOneAndUpdate để đảm bảo mỗi vé chỉ
 * trừ kho đúng 1 lần, kể cả khi webhook thanh toán bị gọi lặp.
 * Nếu trừ kho lỗi, cờ được đặt lại để lần retry sau có thể trừ tiếp.
 */
export const deductStockForTicket = async (ticketId: string): Promise<boolean> => {
  if (!mongoose.Types.ObjectId.isValid(ticketId)) return false;

  // "Claim" quyền trừ kho trước, tránh 2 request song song cùng trừ.
  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, status: 'completed', stockDeducted: false },
    { $set: { stockDeducted: true } },
    { returnDocument: 'after' }
  );

  if (!ticket) return false;

  const quantityByCombo = new Map<string, number>();
  for (const line of ticket.combos || []) {
    const comboId = String(line.comboId);
    const quantity = Number(line.quantity) || 0;
    if (!comboId || quantity <= 0) continue;
    quantityByCombo.set(comboId, (quantityByCombo.get(comboId) || 0) + quantity);
  }

  try {
    for (const [comboId, quantity] of quantityByCombo) {
      // Cho phép tồn kho âm nếu bán vượt số đã nhập: phản ánh đúng thực tế
      // để admin thấy thiếu dữ liệu nhập kho, không chặn khách đã trả tiền.
      await Combo.updateOne({ _id: comboId }, { $inc: { stock: -quantity } });
    }
  } catch (error) {
    // Trả cờ về false để lần retry sau trừ lại.
    await Ticket.updateOne({ _id: ticketId }, { $set: { stockDeducted: false } });
    throw error;
  }

  return true;
};

/**
 * Tồn kho hiện tại của từng combo + số lượng đã nhập / đã bán.
 */
export const getStock = async (filters: StockFilters = {}) => {
  const combos = await Combo.find()
    .select('name price costPrice stock minStock isActive image')
    .sort({ name: 1 });

  const [importAgg, soldAgg] = await Promise.all([
    ImportReceipt.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.comboId',
          importedQuantity: { $sum: '$items.quantity' },
          importedAmount: { $sum: '$items.lineTotal' },
        },
      },
    ]),
    Ticket.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$combos' },
      {
        $group: {
          _id: '$combos.comboId',
          soldQuantity: { $sum: '$combos.quantity' },
        },
      },
    ]),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const importMap = new Map(importAgg.map((row: any) => [String(row._id), row]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const soldMap = new Map(soldAgg.map((row: any) => [String(row._id), row]));

  const keyword = filters.search?.trim().toLowerCase() || '';
  const lowStockOnly = Boolean(filters.lowStockOnly);

  const stock = combos
    .map((combo) => {
      const id = String(combo._id);
      const stockQuantity = Number(combo.stock) || 0;
      const costPrice = Number(combo.costPrice) || 0;
      const price = Number(combo.price) || 0;
      const minStock = Number(combo.minStock) || 0;
      const imported = importMap.get(id);
      const sold = soldMap.get(id);

      return {
        _id: id,
        name: combo.name,
        image: combo.image,
        isActive: combo.isActive,
        price,
        costPrice,
        stock: stockQuantity,
        minStock,
        lowStock: stockQuantity <= minStock,
        importedQuantity: Number(imported?.importedQuantity) || 0,
        importedAmount: Number(imported?.importedAmount) || 0,
        soldQuantity: Number(sold?.soldQuantity) || 0,
        stockValue: stockQuantity * costPrice,
        profitPerUnit: price - costPrice,
        marginPercent: price > 0 ? Math.round(((price - costPrice) / price) * 100) : 0,
      };
    })
    .filter((item) => {
      if (keyword && !item.name.toLowerCase().includes(keyword)) return false;
      if (lowStockOnly && !item.lowStock) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.lowStock !== b.lowStock) return a.lowStock ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return stock;
};

/**
 * Tổng quan kho: tiền nhập trong kỳ, giá trị tồn, số mặt hàng sắp hết.
 */
export const getInventorySummary = async (filters: InventoryFilters = {}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receiptMatch: Record<string, any> = {};
  const dateQuery = buildImportDateQuery(filters);
  if (dateQuery) {
    receiptMatch.importDate = dateQuery;
  }

  const [receiptAgg, combos, totalReceipts] = await Promise.all([
    ImportReceipt.aggregate([
      { $match: receiptMatch },
      {
        $group: {
          _id: null,
          totalImportCost: { $sum: '$totalAmount' },
          totalImportQuantity: { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]),
    Combo.find().select('stock costPrice minStock'),
    ImportReceipt.countDocuments(receiptMatch),
  ]);

  const importSummary = receiptAgg[0] || {
    totalImportCost: 0,
    totalImportQuantity: 0,
  };

  const totalStockQuantity = combos.reduce(
    (sum, combo) => sum + (Number(combo.stock) || 0),
    0
  );
  const totalStockValue = combos.reduce(
    (sum, combo) =>
      sum + (Number(combo.stock) || 0) * (Number(combo.costPrice) || 0),
    0
  );
  const lowStockCount = combos.filter(
    (combo) => (Number(combo.stock) || 0) <= (Number(combo.minStock) || 0)
  ).length;

  return {
    totalImportCost: Number(importSummary.totalImportCost) || 0,
    totalImportQuantity: Number(importSummary.totalImportQuantity) || 0,
    totalImportReceipts: totalReceipts,
    totalCombos: combos.length,
    totalStockQuantity,
    totalStockValue,
    lowStockCount,
  };
};
