import { apiClient } from './client';
import bookingClient from './bookingClient';
import type { ApiResponse, Showtime } from './types';

// =========================
// 1. Lấy danh sách suất chiếu
// API: /api/admin/showtimes
// =========================
export const getSalesShowtimes = async (): Promise<Showtime[]> => {
  const res = await apiClient.get<ApiResponse<Showtime[]>>('/showtimes');
  return res.data.data ?? [];
};

// =========================
// 2. Lấy sơ đồ ghế
// API: /api/booking/showtime/:showtimeId/seats
// =========================
export const getSalesSeatMap = async (showtimeId: string) => {
  const res = await bookingClient.get(
    `/booking/showtime/${showtimeId}/seats`,
  );

  return res.data.data;
};

// =========================
// 3. Giữ ghế 5 phút
// API: /api/booking/lock-seats
// =========================
export interface LockSeatsPayload {
  showtimeId: string;
  seats: string[];
  combos?: Array<{
    comboId: string;
    quantity: number;
  }>;
  voucherCode?: string;
  ticketId?: string;
}

export const lockSalesSeats = async (payload: LockSeatsPayload) => {
  const res = await bookingClient.post(
    '/booking/lock-seats',
    payload,
  );

  return res.data.data;
};

// =========================
// 4. Nhả ghế
// API: /api/booking/release-seats
// =========================
export const releaseSalesSeats = async (ticketId: string) => {
  const res = await bookingClient.post(
    '/booking/release-seats',
    { ticketId },
  );

  return res.data;
};

// =========================
// 5. Kiểm tra trạng thái vé
// API: /api/booking/status/:ticketId
// =========================
export const getSalesBookingStatus = async (ticketId: string) => {
  const res = await bookingClient.get(
    `/booking/status/${ticketId}`,
  );

  return res.data.data;
};

// =========================
// 6. Tạo QR thanh toán
// API: /api/booking/create-qr
// =========================
export interface CreateSalesQRPayload {
  amount: number;
  description: string;
  bankId: string;
  accountNo: string;
  accountName: string;
}

export const createSalesPaymentQR = async (
  payload: CreateSalesQRPayload,
) => {
  const res = await bookingClient.post(
    '/booking/create-qr',
    payload,
  );

  return res.data.data;
};

// =========================
// 7. Xác nhận thanh toán
// API: /api/booking/confirm
// =========================
export interface ConfirmSalesPaymentPayload {
  showtimeId: string;
  seats: string[];
  paymentReference?: string;
}

export const confirmSalesPayment = async (
  payload: ConfirmSalesPaymentPayload,
) => {
  const res = await bookingClient.post(
    '/booking/confirm',
    payload,
  );

  return res.data;
};