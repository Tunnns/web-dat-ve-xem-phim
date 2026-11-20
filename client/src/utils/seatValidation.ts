import type { Seat } from '../types/booking'

export interface OrphanSeatValidationResult {
  isValid: boolean
  message?: string
  orphanSeats: string[]
}

/**
 * Thuật toán kiểm tra ghế đơn độc bị bỏ trống (Orphan Seat Rule):
 * Không cho phép khách hàng để trống đúng 1 ghế ở:
 *  - Giữa 2 ghế đã có người / đang chọn
 *  - Đầu hàng (sát tường / lối đi)
 *  - Cuối hàng (sát tường / lối đi)
 *
 * Chỉ vi phạm khi thao tác của người dùng TẠO RA ghế đơn độc mới.
 * Nếu ghế đơn độc vốn đã tồn tại từ trước đó, người dùng không bị phạt.
 */
function findOrphanSeats(
  seats: Seat[],
  occupiedSeatIds: Set<string>,
): string[] {
  // Gom nhóm ghế theo từng hàng
  const rowMap = new Map<string, Seat[]>()
  for (const seat of seats) {
    if (seat.status === 'maintenance') continue // Ghế bảo trì không tính
    if (!rowMap.has(seat.row)) {
      rowMap.set(seat.row, [])
    }
    rowMap.get(seat.row)!.push(seat)
  }

  const orphans: string[] = []

  for (const [, rowSeats] of rowMap.entries()) {
    // Sắp xếp theo số ghế tăng dần (1, 2, 3...)
    rowSeats.sort((a, b) => a.number - b.number)

    let i = 0
    while (i < rowSeats.length) {
      const seat = rowSeats[i]
      const isOccupied =
        seat.status === 'booked' ||
        seat.status === 'holding' ||
        occupiedSeatIds.has(seat.id)

      if (isOccupied) {
        i++
        continue
      }

      // Khám phá một dải ghế trống liên tiếp
      const emptyRun: Seat[] = []
      while (i < rowSeats.length) {
        const currentSeat = rowSeats[i]
        const currentOccupied =
          currentSeat.status === 'booked' ||
          currentSeat.status === 'holding' ||
          occupiedSeatIds.has(currentSeat.id)

        if (currentOccupied) break

        // Nếu có lối đi ở giữa (số ghế không liên tiếp, ví dụ từ ghế 4 nhảy lên ghế 6)
        if (emptyRun.length > 0) {
          const prevSeat = emptyRun[emptyRun.length - 1]
          if (currentSeat.number !== prevSeat.number + 1) {
            break // Lối đi phân tách không gian, ngắt dải ghế trống
          }
        }

        emptyRun.push(currentSeat)
        i++
      }

      // Nếu dải ghế trống có đúng 1 ghế -> Ghế đơn độc (Orphan Seat)
      if (emptyRun.length === 1) {
        orphans.push(emptyRun[0].id)
      }
    }
  }

  return orphans
}

/**
 * Kiểm tra xem danh sách ghế đang chọn có vi phạm quy tắc để trống 1 ghế không
 * @param allSeats Toàn bộ ghế trong phòng chiếu (kèm trạng thái hiện tại)
 * @param selectedSeatIds Danh sách ID các ghế mà người dùng đang chọn
 */
export function checkOrphanSeats(
  allSeats: Seat[],
  selectedSeatIds: string[],
): OrphanSeatValidationResult {
  if (!allSeats || allSeats.length === 0 || selectedSeatIds.length === 0) {
    return { isValid: true, orphanSeats: [] }
  }

  // 1. Tìm các ghế đơn độc TRƯỚC khi người dùng chọn (ghế lẻ vốn đã có từ trước)
  const existingOrphans = findOrphanSeats(allSeats, new Set())

  // 2. Tìm các ghế đơn độc SAU khi áp dụng lựa chọn của người dùng
  const newOrphans = findOrphanSeats(allSeats, new Set(selectedSeatIds))

  // 3. Lọc ra những ghế đơn độc DO CHÍNH NGƯỜI DÙNG TẠO RA
  const causedOrphans = newOrphans.filter((id) => !existingOrphans.includes(id))

  if (causedOrphans.length > 0) {
    return {
      isValid: false,
      orphanSeats: causedOrphans,
      message: `Không được để trống 1 ghế đơn lẻ (${causedOrphans.join(', ')}). Vui lòng chọn ghế liền kề hoặc cách nhau từ 2 ghế trở lên!`,
    }
  }

  return { isValid: true, orphanSeats: [] }
}
