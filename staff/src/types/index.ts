export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  role: 'staff' | 'admin' | 'manager';
  phone?: string;
  theaterId?: string;
}

export interface Movie {
  _id: string;
  title: string;
  posterUrl?: string;
  poster?: string;
  bannerUrl?: string;
  duration: number;
  genre: string[];
  ageRating?: string;
}

export interface Theater {
  _id: string;
  name: string;
  address: string;
  hotline?: string;
}

export interface Room {
  _id: string;
  name: string;
  capacity?: number;
  seatSurcharges?: {
    normal?: number;
    vip?: number;
    couple?: number;
  };
  seatLayout?: Array<{
    code: string;
    type: 'normal' | 'vip' | 'couple';
    status: 'available' | 'maintenance';
    surcharge?: number;
  }>;
}

export interface Showtime {
  _id: string;
  movie: Movie;
  theater: Theater;
  room: Room;
  startTime: string;
  endTime: string;
  price: number;
  finalPrice?: number;
  availableSeats?: number;
  totalSeats?: number;
  isEarlyAccess?: boolean;
  format?: string;
}

export interface Combo {
  _id: string;
  name: string;
  price: number;
  description?: string;
  items?: Array<{ name: string; quantity: number }>;
  image?: string;
  imageUrl?: string;
  flavors?: string[];
  stock?: number;
  minStock?: number;
  isActive: boolean;
}

export interface Ticket {
  _id: string;
  code?: string;
  orderType?: 'ticket' | 'combo_only';
  user?: {
    fullName: string;
    email: string;
    phone?: string;
  };
  theater?: Theater;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  showtime?: Showtime;
  seats: string[];
  combos?: Array<{
    comboId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    selectedFlavor?: string;
  }>;
  totalAmount: number;
  discount?: number;
  voucherCode?: string;
  paymentMethod: string;
  paymentReference?: string;
  status: 'completed' | 'pending' | 'cancelled';
  isUsed?: boolean;
  usedAt?: string;
  usedBy?: {
    fullName: string;
    email: string;
  };
  soldBy?: {
    fullName: string;
    email: string;
  };
  cashReceived?: number;
  cashChange?: number;
  qrCode?: string;
  paidAt?: string;
  createdAt: string;
}

export interface SeatStatus {
  seat: string;
  type: 'normal' | 'vip' | 'couple';
  status: 'available' | 'booked' | 'holding' | 'selected';
}
