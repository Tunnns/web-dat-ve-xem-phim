import mongoose, { Schema, Document } from 'mongoose';

export interface IImportReceiptItem {
  comboId: mongoose.Types.ObjectId; // Combo được nhập kho
  name: string; // Tên combo tại thời điểm nhập (snapshot)
  quantity: number; // Số lượng nhập
  unitCost: number; // Đơn giá nhập trên 1 combo
  lineTotal: number; // quantity * unitCost
}

export interface IImportReceipt extends Document {
  code: string; // Mã phiếu nhập, VD: PNK-20261112-001
  importDate: Date; // Ngày nhập kho
  supplier?: string; // Nhà cung cấp
  items: IImportReceiptItem[]; // Danh sách combo nhập trong phiếu
  totalAmount: number; // Tổng tiền của phiếu nhập
  note?: string; // Ghi chú
  createdBy?: mongoose.Types.ObjectId; // Tài khoản tạo phiếu
  createdByName?: string; // Tên người tạo tại thời điểm nhập
  createdAt: Date;
  updatedAt: Date;
}

const importReceiptItemSchema = new Schema<IImportReceiptItem>(
  {
    comboId: { type: Schema.Types.ObjectId, ref: 'Combo', required: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const importReceiptSchema = new Schema<IImportReceipt>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    importDate: { type: Date, required: true, default: Date.now },
    supplier: { type: String, trim: true },
    items: { type: [importReceiptItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String, trim: true },
  },
  { timestamps: true }
);

// Tăng tốc tra cứu phiếu nhập theo ngày và theo combo
importReceiptSchema.index({ importDate: -1 });
importReceiptSchema.index({ 'items.comboId': 1 });

export default mongoose.model<IImportReceipt>('ImportReceipt', importReceiptSchema);
