import axios from 'axios';
import { ADMIN_AUTH_STORAGE } from './client';

const ROOT_API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/admin'
).replace(/\/admin\/?$/, '');

export const posRootClient = axios.create({
  baseURL: ROOT_API_URL,
  timeout: 20000,
});

posRootClient.interceptors.request.use((config) => {
  try {
    const savedAuth = localStorage.getItem(ADMIN_AUTH_STORAGE);
    if (savedAuth) {
      const parsed = JSON.parse(savedAuth);
      const token = parsed?.state?.token ?? parsed?.token ?? null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // ignore malformed auth cache
  }
  return config;
});

export interface PosSeat {
  code: string;
  type: 'normal' | 'vip' | 'couple';
  status: 'available' | 'maintenance';
  surcharge?: number;
}

export interface PosShowtimeSeatsResponse {
  showtimeId: string;
  seatLayout: PosSeat[];
  seatSurcharges: { normal?: number; vip?: number; couple?: number } | null;
  basePrice: number;
  effectiveBasePrice: number;
  bookedSeats: string[];
  holdingSeats: Array<{ seat: string; lockedUntil: string; isMine: boolean }>;
}

export interface PosCombo {
  _id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  minStock: number;
  items?: Array<{ name: string; quantity: number }>;
  image?: string;
  flavors?: string[];
  isActive: boolean;
}

export interface PosCalculatePayload {
  orderType: 'ticket' | 'combo_only';
  showtimeId?: string;
  seats?: string[];
  combos: Array<{ comboId: string; quantity: number; selectedFlavor?: string }>;
  voucherCode?: string;
}

export interface PosSellPayload extends PosCalculatePayload {
  theaterId?: string;
  paymentMethod: 'cash' | 'vietqr';
  paymentReference?: string;
  ticketId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  cashReceived?: number;
  cashChange?: number;
}

export const getCounterShowtimeSeats = async (
  showtimeId: string
): Promise<PosShowtimeSeatsResponse> => {
  const res = await posRootClient.get(`/tickets/showtime/${showtimeId}/seats`);
  return res.data.data;
};

export const getCounterCombos = async (): Promise<PosCombo[]> => {
  const res = await posRootClient.get('/tickets/pos-combos');
  return res.data.data ?? [];
};

export const calculateCounterPrice = async (payload: PosCalculatePayload) => {
  const res = await posRootClient.post('/payment/calculate', payload);
  return res.data.data;
};

export const validateCounterVoucher = async (code: string, subtotal: number) => {
  const res = await posRootClient.post('/payment/voucher/validate', { code, subtotal });
  return res.data.data;
};

export const createCounterVietQR = async (
  payload: PosCalculatePayload & { theaterId?: string; amount: number }
) => {
  const res = await posRootClient.post('/payment/qr', payload);
  return res.data.data;
};

export const checkCounterPaymentStatus = async (orderCode: string) => {
  const res = await posRootClient.get(`/payment/status/${orderCode}`);
  return res.data;
};

export const posSellCounterTicket = async (payload: PosSellPayload) => {
  const res = await posRootClient.post('/tickets/pos-sell', payload);
  return res.data.data;
};
 
