import { ISeat } from '../models/Room';

export interface OrphanSeatResult {
  isValid: boolean;
  message?: string;
  orphanSeats: string[];
}

interface ParsedSeat {
  code: string;
  row: string;
  number: number;
  status: 'available' | 'maintenance';
}

function parseSeatCode(seat: ISeat): ParsedSeat {
  const match = seat.code.match(/^([A-Za-z]+)(\d+)$/);
  const row = match ? match[1].toUpperCase() : seat.code.charAt(0).toUpperCase();
  const number = match ? parseInt(match[2], 10) : 0;
  return {
    code: seat.code,
    row,
    number,
    status: seat.status,
  };
}

/**
 * Tìm các ghế đơn độc (orphan empty seats) có độ dài chuỗi trống đúng 1 ghế
 */
function findOrphanSeatsInLayout(
  parsedSeats: ParsedSeat[],
  occupiedCodes: Set<string>
): string[] {
  const rowMap = new Map<string, ParsedSeat[]>();
  for (const s of parsedSeats) {
    if (s.status === 'maintenance') continue;
    if (!rowMap.has(s.row)) rowMap.set(s.row, []);
    rowMap.get(s.row)!.push(s);
  }

  const orphans: string[] = [];

  for (const [, rowSeats] of rowMap.entries()) {
    rowSeats.sort((a, b) => a.number - b.number);

    let i = 0;
    while (i < rowSeats.length) {
      if (occupiedCodes.has(rowSeats[i].code)) {
        i++;
        continue;
      }

      // Dải ghế trống liên tiếp
      const emptyRun: ParsedSeat[] = [];
      while (i < rowSeats.length && !occupiedCodes.has(rowSeats[i].code)) {
        if (emptyRun.length > 0) {
          const prev = emptyRun[emptyRun.length - 1];
          // Nếu có lối đi ở giữa (nhảy số ghế)
          if (rowSeats[i].number !== prev.number + 1) {
            break;
          }
        }
        emptyRun.push(rowSeats[i]);
        i++;
      }

      if (emptyRun.length === 1) {
        orphans.push(emptyRun[0].code);
      }
    }
  }

  return orphans;
}

/**
 * Kiểm tra quy tắc không để trống ghế đơn lẻ (Orphan Seat Rule)
 * @param seatLayout Toàn bộ ghế trong phòng chiếu (từ Room model)
 * @param existingOccupiedCodes Các ghế đã có người đặt hoặc đang được người khác giữ
 * @param selectedSeatCodes Các ghế mà khách hàng đang yêu cầu đặt
 */
export function validateOrphanSeats(
  seatLayout: ISeat[],
  existingOccupiedCodes: string[],
  selectedSeatCodes: string[]
): OrphanSeatResult {
  if (!Array.isArray(seatLayout) || seatLayout.length === 0 || selectedSeatCodes.length === 0) {
    return { isValid: true, orphanSeats: [] };
  }

  const parsed = seatLayout.map(parseSeatCode);
  const baseOccupiedSet = new Set(existingOccupiedCodes);

  // 1. Tìm các ghế đơn độc vốn đã có từ trước (không do user hiện tại tạo ra)
  const existingOrphans = findOrphanSeatsInLayout(parsed, baseOccupiedSet);

  // 2. Tìm các ghế đơn độc sau khi user chọn ghế
  const newOccupiedSet = new Set([...existingOccupiedCodes, ...selectedSeatCodes]);
  const newOrphans = findOrphanSeatsInLayout(parsed, newOccupiedSet);

  // 3. Chỉ phạt những ghế đơn độc DO CHÍNH USER TẠO RA
  const causedOrphans = newOrphans.filter((code) => !existingOrphans.includes(code));

  if (causedOrphans.length > 0) {
    return {
      isValid: false,
      orphanSeats: causedOrphans,
      message: `Không được để trống 1 ghế đơn lẻ (${causedOrphans.join(', ')}). Vui lòng chọn ghế liền kề hoặc cách nhau từ 2 ghế trở lên!`,
    };
  }

  return { isValid: true, orphanSeats: [] };
}
