import { validateOrphanSeats } from '../utils/seatValidation';
import { ISeat } from '../models/Room';

function createRow(rowLetter: string, count: number): ISeat[] {
  const seats: ISeat[] = [];
  for (let i = 1; i <= count; i++) {
    seats.push({
      code: `${rowLetter}${i}`,
      type: 'normal',
      status: 'available',
    });
  }
  return seats;
}

function runTests() {
  console.log('--- BAT DAU TEST THUAT TOAN ORPHAN SEAT ---');
  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${title}`);
    } else {
      console.error(`[FAIL] ${title} - ${extra}`);
    }
  }

  const rowA = createRow('A', 10); // A1 -> A10

  // Test 1: Khách chọn A1 (đầu hàng) -> Hợp lệ
  {
    const res = validateOrphanSeats(rowA, [], ['A1']);
    assert('Khach chon A1 tren hang trong hoan toan -> Hop le', res.isValid === true);
  }

  // Test 2: Khách chọn A2 (bỏ trống A1 ở đầu hàng) -> Chặn
  {
    const res = validateOrphanSeats(rowA, [], ['A2']);
    assert('Khach chon A2 bo trong A1 sat tuong -> Chan', res.isValid === false && res.orphanSeats.includes('A1'));
  }

  // Test 3: Khách chọn A1 + A2 -> Hợp lệ
  {
    const res = validateOrphanSeats(rowA, [], ['A1', 'A2']);
    assert('Khach chon A1 + A2 lien ke -> Hop le', res.isValid === true);
  }

  // Test 4: A1 đã có người đặt, khách chọn A3 -> Chặn A2 kẹp giữa
  {
    const res = validateOrphanSeats(rowA, ['A1'], ['A3']);
    assert('A1 da dat, chon A3 de trong A2 kep giua -> Chan', res.isValid === false && res.orphanSeats.includes('A2'));
  }

  // Test 5: A1 đã có người đặt, khách chọn A3 + A4 -> Vẫn chặn A2 kẹp giữa
  {
    const res = validateOrphanSeats(rowA, ['A1'], ['A3', 'A4']);
    assert('A1 da dat, chon A3+A4 de trong A2 kep giua -> Chan', res.isValid === false && res.orphanSeats.includes('A2'));
  }

  // Test 6: A1 đã có người đặt, khách chọn A4 -> Để trống A2, A3 (2 ghế) -> HỢP LỆ
  {
    const res = validateOrphanSeats(rowA, ['A1'], ['A4']);
    assert('A1 da dat, chon A4 cach 2 ghe trong (A2, A3) -> Hop le', res.isValid === true);
  }

  // Test 7: Khách chọn A8, A9 -> Bỏ trống A10 ở cuối hàng -> Chặn
  {
    const res = validateOrphanSeats(rowA, [], ['A8', 'A9']);
    assert('Chon A8, A9 de trong A10 o cuoi hang -> Chan', res.isValid === false && res.orphanSeats.includes('A10'));
  }

  // Test 8: Khách chọn A8, A9, A10 -> Hợp lệ
  {
    const res = validateOrphanSeats(rowA, [], ['A8', 'A9', 'A10']);
    assert('Chon A8, A9, A10 den sat tuong cuoi hang -> Hop le', res.isValid === true);
  }

  // Test 9: A2 vốn đã là ghế trống đơn độc từ trước (do lịch sử đặt A1 và A3).
  // Khách mới vào chọn A8, A9, A10 ở tít xa -> Không được phạt khách vì A2!
  {
    const res = validateOrphanSeats(rowA, ['A1', 'A3'], ['A8', 'A9', 'A10']);
    assert('A2 von da le tu truoc, khach chon ghe o xa -> Khong bi phat vi A2', res.isValid === true);
  }

  // Test 10: Khách mua đúng chiếc ghế A2 bị lẻ từ trước -> Hợp lệ
  {
    const res = validateOrphanSeats(rowA, ['A1', 'A3'], ['A2']);
    assert('Khach mua dung ghe A2 bi le tu truoc -> Hop le', res.isValid === true);
  }

  console.log(`\nKet qua: ${passed}/${total} test cases PASSED.`);
  if (passed === total) {
    console.log('>>> TAT CA TEST CASES DAT YEU CAU 100%! <<<');
  } else {
    process.exit(1);
  }
}

runTests();
