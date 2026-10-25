import { completeTicketPayment } from './ticket.service';
import { AppError } from '../utils/appError';

export interface CreateVietQROptions {
  amount: number;
  description: string;
  bankId?: string;
  accountNo?: string;
  accountName?: string;
}

export interface PaymentWebhookPayload {
  paymentReference: string;
  amount: number;
  ticketId?: string;
  userId?: string;
  showtimeId?: string;
  seats?: string[];
  combos?: Array<{ comboId: string; quantity: number }>;
  voucherCode?: string;
  paymentMethod?: string;
  status?: string;
}

/**
 * Tạo liên kết mã QR VietQR chuẩn ngân hàng phục vụ thanh toán.
 */
export const createVietQRPayment = (options: CreateVietQROptions) => {
  const { amount, description, bankId, accountNo, accountName } = options;

  if (!amount || amount <= 0) {
    throw new AppError('Số tiền thanh toán phải lớn hơn 0', 400);
  }
  if (!description) {
    throw new AppError('Nội dung chuyển khoản không được để trống', 400);
  }

  const defaultBankId = process.env.VIETQR_BANK_ID || bankId || 'MB';
  const defaultAccountNo = process.env.VIETQR_ACCOUNT_NO || accountNo || '0123456789';
  const defaultAccountName = process.env.VIETQR_ACCOUNT_NAME || accountName || 'RAP CHIEU PHIM CINEMA';

  const encodedDescription = encodeURIComponent(description);
  const encodedAccountName = encodeURIComponent(defaultAccountName);

  const qrUrl = `https://img.vietqr.io/image/${defaultBankId}-${defaultAccountNo}-compact2.png?amount=${amount}&addInfo=${encodedDescription}&accountName=${encodedAccountName}`;

  return {
    qrUrl,
    amount,
    description,
    bankId: defaultBankId,
    accountNo: defaultAccountNo,
    accountName: defaultAccountName,
  };
};

/**
 * Xử lý webhook / callback từ cổng thanh toán tự động cập nhật trạng thái vé.
 */
export const handlePaymentWebhook = async (payload: PaymentWebhookPayload) => {
  const {
    paymentReference,
    amount,
    ticketId,
    userId,
    showtimeId,
    seats = [],
    combos,
    voucherCode,
    paymentMethod = 'vietqr',
    status,
  } = payload;

  if (!paymentReference) {
    throw new AppError('Thiếu mã giao dịch thanh toán (paymentReference)', 400);
  }

  // Nếu cổng thanh toán thông báo giao dịch thất bại
  if (status && ['FAILED', 'CANCELLED', 'EXPIRED'].includes(status.toUpperCase())) {
    return {
      success: false,
      message: 'Giao dịch không thành công hoặc đã bị hủy',
      paymentReference,
      status: 'failed',
    };
  }

  if (!userId && !ticketId) {
    throw new AppError('Cần cung cấp thông tin userId hoặc ticketId để hoàn tất vé', 400);
  }

  // Hoàn tất đơn đặt vé và sinh mã vé QR
  const result = await completeTicketPayment({
    userId: userId || '',
    ticketId,
    showtimeId: showtimeId || '',
    seats,
    combos,
    voucherCode,
    paymentMethod,
    paymentReference,
  });

  return {
    success: true,
    message: 'Xác nhận thanh toán thành công, vé điện tử đã được phát hành',
    data: result,
  };
};
