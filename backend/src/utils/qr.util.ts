import crypto from 'crypto';
import QRCode from 'qrcode';

/**
 * Nội dung nhúng trong mã QR của vé điện tử.
 * Máy quét tại rạp đọc JSON này để lấy mã vé / ID vé và đối chiếu với DB.
 */
export interface TicketQrPayload {
  v: 1; // Phiên bản payload, dùng khi cần nâng cấp định dạng
  ticketId: string;
  code: string; // Mã vé duy nhất (lưu ở Ticket.code)
  showtimeId: string;
  seats: string[];
}

export interface TicketQrSource {
  ticketId: string;
  code: string;
  showtimeId: string;
  seats: string[];
}

const TICKET_CODE_PREFIX = 'TKT';

/** Cấu hình hình ảnh QR dùng chung cho mọi vé */
const QR_IMAGE_OPTIONS = {
  type: 'image/png' as const,
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  width: 360,
  color: {
    dark: '#111111',
    light: '#FFFFFF',
  },
};

/**
 * Sinh mã vé duy nhất.
 *
 * Cấu trúc: TKT-<thời gian base36>-<16 ký tự hex ngẫu nhiên>
 * - Phần thời gian giúp mã dễ đọc/sắp xếp theo thời điểm phát hành.
 * - Phần ngẫu nhiên lấy từ crypto.randomBytes (an toàn hơn Math.random).
 *
 * Lưu ý: tính duy nhất cuối cùng vẫn được bảo đảm bởi unique index trên
 * Ticket.code. Service sẽ thử lại vài lần nếu xảy ra trùng (rất hiếm).
 */
export const generateTicketCode = (): string => {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${TICKET_CODE_PREFIX}-${timePart}-${randomPart}`;
};

/** Tạo payload QR từ thông tin vé (không sinh ảnh) */
export const buildTicketQrPayload = (source: TicketQrSource): TicketQrPayload => ({
  v: 1,
  ticketId: String(source.ticketId),
  code: source.code,
  showtimeId: String(source.showtimeId),
  seats: [...source.seats],
});

/** Chuyển payload QR thành chuỗi để nhúng vào ảnh QR */
export const encodeTicketQrPayload = (payload: TicketQrPayload): string => JSON.stringify(payload);

/** Sinh ảnh QR dạng data URL (base64 PNG), dùng trực tiếp trong thẻ <img src="..."> */
export const generateQrDataUrl = (content: string): Promise<string> =>
  QRCode.toDataURL(content, QR_IMAGE_OPTIONS);

/**
 * Sinh đầy đủ payload + ảnh QR cho một vé điện tử.
 * Hàm này là điểm vào chính, được service gọi sau khi thanh toán thành công.
 */
export const generateTicketQr = async (
  source: TicketQrSource
): Promise<{ payload: TicketQrPayload; dataUrl: string }> => {
  const payload = buildTicketQrPayload(source);
  const dataUrl = await generateQrDataUrl(encodeTicketQrPayload(payload));
  return { payload, dataUrl };
};
