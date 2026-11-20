import dayjs, { type Dayjs } from 'dayjs';
import type { PricingRule } from '../api/types';

const toMin = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Giá = giá gốc + phụ phí khung giờ + max(phụ phí cuối tuần, phụ phí ngày lễ). Khớp với backend. */
export const previewPrice = (base: number, start: Dayjs, rule: PricingRule | null) => {
  if (!rule) return { final: base, slot: undefined as string | undefined, day: undefined as string | undefined };
  const mins = start.hour() * 60 + start.minute();
  const slot = rule.timeSlots.find((s) => mins >= toMin(s.from) && mins < toMin(s.to));
  const holiday = rule.holidays.find(
    (h) => h.date === start.format('YYYY-MM-DD') || h.date === start.format('MM-DD'),
  );
  const dow = start.day();
  let dayName: string | undefined;
  let daySur = 0;
  if (dow === 0 || dow === 6) {
    dayName = dow === 0 ? 'Chủ nhật' : 'Thứ 7';
    daySur = rule.weekendSurcharge || 0;
  }
  if (holiday && holiday.surcharge >= daySur) {
    dayName = holiday.name;
    daySur = holiday.surcharge;
  }
  return { final: base + (slot?.surcharge || 0) + daySur, slot: slot?.name, day: dayName };
};

export const fmtDayjs = (d: Dayjs) => dayjs(d).format('HH:mm DD/MM');