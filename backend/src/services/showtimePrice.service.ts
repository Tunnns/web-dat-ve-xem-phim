import PricingRule, { IPricingRule } from '../models/PricingRule';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export const DEFAULT_PRICING_RULE = {
  timeSlots: [
    { name: 'Sáng', from: '00:00', to: '12:00', surcharge: 0 },
    { name: 'Chiều', from: '12:00', to: '17:00', surcharge: 0 },
    { name: 'Tối', from: '17:00', to: '24:00', surcharge: 15000 },
  ],
  weekendSurcharge: 10000,
  holidays: [
    { date: '01-01', name: 'Tết Dương lịch', surcharge: 20000 },
    { date: '04-30', name: 'Giải phóng miền Nam', surcharge: 20000 },
    { date: '05-01', name: 'Quốc tế Lao động', surcharge: 20000 },
    { date: '09-02', name: 'Quốc khánh', surcharge: 20000 },
  ],
};

export const getPricingRule = async () => {
  const rule = await PricingRule.findOne({ key: 'default' });
  return rule ?? (await PricingRule.create({ key: 'default', ...DEFAULT_PRICING_RULE }));
};

export const savePricingRule = async (data: Partial<IPricingRule>) => {
  const payload = {
    timeSlots: data.timeSlots ?? [],
    weekendSurcharge: Number(data.weekendSurcharge) || 0,
    holidays: data.holidays ?? [],
  };
  return PricingRule.findOneAndUpdate({ key: 'default' }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

type RuleLike = Pick<IPricingRule, 'timeSlots' | 'weekendSurcharge' | 'holidays'>;

export interface PriceBreakdown {
  basePrice: number;
  slotName?: string;
  slotSurcharge: number;
  dayType: 'weekday' | 'weekend' | 'holiday';
  dayName?: string;
  daySurcharge: number;
  finalPrice: number;
}

/** Giá suất chiếu = giá gốc + phụ phí khung giờ + max(phụ phí cuối tuần, phụ phí ngày lễ). */
export const resolveShowtimePrice = (
  basePrice: number,
  startTime: Date | string,
  rule: RuleLike | null,
): PriceBreakdown => {
  const base = basePrice || 0;
  if (!rule) {
    return { basePrice: base, slotSurcharge: 0, dayType: 'weekday', daySurcharge: 0, finalPrice: base };
  }
  const vn = new Date(new Date(startTime).getTime() + VN_OFFSET_MS); // đọc bằng getUTC*
  const minutes = vn.getUTCHours() * 60 + vn.getUTCMinutes();
  const slot = rule.timeSlots.find((s) => minutes >= toMinutes(s.from) && minutes < toMinutes(s.to));

  const pad = (n: number) => String(n).padStart(2, '0');
  const mmdd = `${pad(vn.getUTCMonth() + 1)}-${pad(vn.getUTCDate())}`;
  const full = `${vn.getUTCFullYear()}-${mmdd}`;
  const holiday = rule.holidays.find((h) => h.date === full || h.date === mmdd);
  const dow = vn.getUTCDay();
  const isWeekend = dow === 0 || dow === 6;

  let dayType: PriceBreakdown['dayType'] = 'weekday';
  let dayName: string | undefined;
  let daySurcharge = 0;
  if (isWeekend) {
    dayType = 'weekend';
    dayName = dow === 0 ? 'Chủ nhật' : 'Thứ 7';
    daySurcharge = rule.weekendSurcharge || 0;
  }
  if (holiday && holiday.surcharge >= daySurcharge) {
    dayType = 'holiday';
    dayName = holiday.name;
    daySurcharge = holiday.surcharge;
  }

  const slotSurcharge = slot?.surcharge || 0;
  return {
    basePrice: base,
    slotName: slot?.name,
    slotSurcharge,
    dayType,
    dayName,
    daySurcharge,
    finalPrice: base + slotSurcharge + daySurcharge,
  };
};
