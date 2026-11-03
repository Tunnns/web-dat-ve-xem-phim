import api, { getErrorMessage } from './axios'

/* ── Types ── */
export interface ComboItem {
  name: string
  quantity: number
}

export interface Combo {
  _id: string
  name: string
  price: number
  items: ComboItem[]
  description?: string
  image?: string
  isActive: boolean
}

export interface VoucherValidation {
  code: string
  description: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  minOrderValue?: number
  discount: number // số tiền giảm thực tế
}

export interface SeatDetail {
  code: string
  type: string
  price: number
}

export interface ComboDetail {
  comboId: string
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface CalculateResponse {
  tickets: { subtotal: number; seats: SeatDetail[] }
  combos: { subtotal: number; items: ComboDetail[] }
  voucher?: {
    code: string
    description: string
    discountType: string
    discountValue: number
    discount: number
  }
  subtotal: number
  discount: number
  total: number
}

export interface CalculateRequest {
  showtimeId: string
  seats: string[]
  combos?: { comboId: string; quantity: number }[]
  voucherCode?: string
  ticketId?: string
}

/* ── API Calls ── */
export const paymentApi = {
  /** Lấy danh sách combo đang bán */
  async getCombos(): Promise<Combo[]> {
    try {
      const res = await api.get('/payment/combos')
      return res.data?.data ?? res.data ?? []
    } catch (err) {
      console.error('Lỗi tải danh sách combo:', getErrorMessage(err))
      return []
    }
  },

  /** Kiểm tra mã giảm giá */
  async validateVoucher(code: string, subtotal: number): Promise<VoucherValidation> {
    const res = await api.post('/payment/voucher/validate', { code, subtotal })
    return res.data.data
  },

  /** Tính tiền (vé + combo + voucher) */
  async calculate(body: CalculateRequest): Promise<CalculateResponse> {
    const res = await api.post('/payment/calculate', body)
    return res.data.data
  },

  /** Sinh mã VietQR tự động kèm theo đăng ký đơn hàng nội bộ */
  async generateQR(params: {
    amount: number
    description?: string
    showtimeId?: string
    seats?: string[]
    combos?: { comboId: string; quantity: number }[]
    voucherCode?: string
    ticketId?: string
    bankId?: string
    accountNo?: string
    accountName?: string
  }): Promise<{
    qrUrl: string
    bankId: string
    accountNo: string
    accountName: string
    amount: number
    description: string
    ticketId?: string
  }> {
    const res = await api.post('/payment/qr', params)
    return res.data.data
  },

  /** Kiểm tra trạng thái giao dịch nội bộ từ cơ sở dữ liệu của dự án */
  async checkPaymentStatus(orderCode: string): Promise<{
    success: boolean
    paid: boolean
    status: 'pending' | 'completed' | 'expired' | 'not_found'
    ticket?: any
  }> {
    const res = await api.get(`/payment/status/${encodeURIComponent(orderCode)}`)
    return res.data
  },

  /** Mô phỏng thanh toán ngân hàng thành công nội bộ (phục vụ kiểm thử tức thì) */
  async simulateTransfer(orderCode: string): Promise<any> {
    const res = await api.post('/payment/simulate-transfer', { orderCode })
    return res.data.data
  },

  /** Xác nhận thanh toán thành công và tạo vé */
  async confirmPayment(body: {
    ticketId?: string
    showtimeId: string
    seats: string[]
    combos?: { comboId: string; quantity: number }[]
    voucherCode?: string
    paymentMethod?: string
    paymentReference?: string
  }): Promise<any> {
    const res = await api.post('/payment/success', body)
    return res.data.data
  },
}
 