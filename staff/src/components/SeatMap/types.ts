export type SeatType = 'normal' | 'vip' | 'couple';
export type SeatStatus = 'available' | 'booked' | 'holding' | 'maintenance';

export interface PosSeat {
  id: string;
  row: string;
  number: number;
  type: SeatType;
  status: SeatStatus;
  price: number;
  pairId?: string;
}
