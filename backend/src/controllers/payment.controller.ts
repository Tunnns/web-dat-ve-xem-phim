import { Request, Response } from 'express';
import { calculatePrice } from '../services/pricing.service';
import { completeTicketPayment } from '../services/ticket.service';
import { getActiveCombos } from '../services/combo.service';
import { validateVoucher } from '../services/voucher.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/appError';

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
  } else {
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ',
      error: (error as Error).message,
    });
  }
};

export const generateVietQR = (req: Request, res: Response) => {
  try {
    const { amount, description, bankId, accountNo, accountName } = req.body;

    // Hardcode fallback cho demo, thực tế sẽ lấy từ DB/Config
    const MY_BANK_ID = bankId || 'MB'; // Tên viết tắt của ngân hàng, ví dụ MB, VCB, ACB...
    const MY_ACCOUNT_NO = accountNo || '0123456789'; // Số tài khoản
    const MY_ACCOUNT_NAME = accountName || 'NGUYEN VAN A'; // Tên chủ tài khoản

    // API của vietqr.io: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png
    // template có thể là 'compact', 'compact2', 'qr_only', 'print'
    const qrUrl = `https://img.vietqr.io/image/${MY_BANK_ID}-${MY_ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      description
    )}&accountName=${encodeURIComponent(MY_ACCOUNT_NAME)}`;

    // Trong thực tế, bạn sẽ tạo 1 record vào bảng Ticket (status: pending)
    // Và tạo 1 record vào bảng Transaction/Payment trước khi trả về QR

    res.status(200).json({
      success: true,
      message: 'Tạo mã QR thành công',
      data: {
        qrUrl,
        amount,
        description,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mã QR',
      error: (error as Error).message,
    });
  }
};

/* Danh sách combo đang bán (phục vụ trang Checkout) */
export const listCombos = async (req: Request, res: Response) => {
  try {
    const combos = await getActiveCombos();
    res.status(200).json({ success: true, message: 'Lấy danh sách combo thành công', data: combos });
  } catch (error) {
    handleError(res, error);
  }
};

/* Tính tiền vé + combo, áp dụng voucher (xem trước, không ghi nhận giao dịch) */
export const calculate = async (req: Request, res: Response) => {
  try {
    const data = await calculatePrice({
      showtimeId: req.body.showtimeId,
      seats: req.body.seats,
      combos: req.body.combos,
      voucherCode: req.body.voucherCode,
    });
    res.status(200).json({ success: true, message: 'Tính tiền thành công', data });
  } catch (error) {
    handleError(res, error);
  }
};

/* Kiểm tra một mã voucher có hợp lệ với giá trị đơn hàng hay không */
export const validateVoucherCode = async (req: Request, res: Response) => {
  try {
    const { voucher, discount } = await validateVoucher(req.body.code, req.body.subtotal);
    res.status(200).json({
      success: true,
      message: 'Mã giảm giá hợp lệ',
      data: {
        code: voucher.code,
        description: voucher.description,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        minOrderValue: voucher.minOrderValue,
        discount,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

/*
 * Xác nhận thanh toán thành công (dùng cho callback/webhook hoặc client gọi sau khi trả tiền).
 * - Tính lại tiền ở server, kiểm tra ghế còn trống.
 * - Sinh mã vé duy nhất + ảnh QR, lưu vé status = completed vào DB.
 * - Nếu truyền ticketId: hoàn tất vé pending đang giữ ghế thay vì tạo vé mới.
 */
export const confirmPaymentSuccess = async (req: AuthRequest, res: Response) => {
  try {
    const data = await completeTicketPayment({
      userId: req.user!.id,
      ticketId: req.body.ticketId,
      showtimeId: req.body.showtimeId,
      seats: req.body.seats,
      combos: req.body.combos,
      voucherCode: req.body.voucherCode,
      paymentMethod: req.body.paymentMethod,
      paymentReference: req.body.paymentReference,
    });

    res.status(200).json({
      success: true,
      message: 'Thanh toán thành công, vé điện tử đã được tạo',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};
