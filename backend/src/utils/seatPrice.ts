import type { ISeat } from '../models/Room';

export type SeatType = ISeat['type'];
export type SeatSurcharges = Record<SeatType, number>;

// Phụ phí mặc định theo loại ghế (VND) khi suất chiếu chưa cấu hình riêng
export const DEFAULT_SEAT_SURCHARGE: SeatSurcharges = {
  normal: 0,
  vip: 25000,
  couple: 20000,
};

/*
 * Giá một ghế = giá cơ bản suất chiếu + phụ phí.
 * Ưu tiên phụ phí: ghế (seat.surcharge) > loại ghế của phòng > mặc định.
 */
export const getSeatPrice = (
  basePrice: number,
  seat: Pick<ISeat, 'type' | 'surcharge'>,
  roomSurcharges?: Partial<SeatSurcharges> | null,
): number => {
  const surcharge =
    seat.surcharge ?? roomSurcharges?.[seat.type] ?? DEFAULT_SEAT_SURCHARGE[seat.type] ?? 0;
  return (basePrice || 0) + surcharge;
};