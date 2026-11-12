import Ticket, { ITicket } from '../models/Ticket';
import ImportReceipt from '../models/ImportReceipt';
import mongoose from 'mongoose';

export interface RevenueFilters {
  startDate?: string;
  endDate?: string;
  theaterId?: string;
  movieId?: string;
  paymentMethod?: string;
}

export interface RevenueTimelineItem {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  ticketCount: number;
}

export interface RevenueByMovieItem {
  movieId: string;
  movieTitle: string;
  revenue: number;
  ticketCount: number;
}

export interface RevenueByTheaterItem {
  theaterId: string;
  theaterName: string;
  revenue: number;
  ticketCount: number;
}

export interface RevenueByPaymentMethodItem {
  method: string;
  revenue: number;
  count: number;
}

export interface RevenueByComboItem {
  comboId: string;
  comboName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface RevenueStructureItem {
  type: string;
  amount: number;
}

export interface RevenueDetailItem {
  _id: string;
  code?: string;
  paidAt?: Date | string;
  movieTitle: string;
  theaterName: string;
  roomName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  seats: string[];
  seatCount: number;
  combos: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  comboTotal: number;
  comboCost: number;
  grossProfit: number;
  ticketAmount: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
}

export interface RevenueAnalyticsResult {
  summary: {
    totalRevenue: number;
    totalTickets: number;
    totalSeats: number;
    totalCombos: number;
    totalDiscount: number;
    averageOrderValue: number;
    ticketRevenue: number;
    comboRevenue: number;
    comboCost: number;
    grossProfit: number;
    grossMargin: number;
    importCost: number;
  };
  timeline: RevenueTimelineItem[];
  byMovie: RevenueByMovieItem[];
  byTheater: RevenueByTheaterItem[];
  byPaymentMethod: RevenueByPaymentMethodItem[];
  byCombo: RevenueByComboItem[];
  revenueStructure: RevenueStructureItem[];
  details: RevenueDetailItem[];
}

export const getRevenueAnalytics = async (
  filters: RevenueFilters
): Promise<RevenueAnalyticsResult> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchQuery: Record<string, any> = {
    status: 'completed',
  };

  if (filters.startDate || filters.endDate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateQuery: Record<string, any> = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      dateQuery.$gte = start;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
    matchQuery.paidAt = dateQuery;
  }

  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    matchQuery.paymentMethod = filters.paymentMethod;
  }

  const rawTickets = await Ticket.find(matchQuery)
    // Giá vốn được ẩn mặc định trong model, cần select rõ ràng cho báo cáo.
    .select('+combos.unitCost +combos.costTotal')
    .populate('user', 'fullName email phone')
    .populate({
      path: 'showtime',
      populate: [
        { path: 'movie', select: 'title' },
        { path: 'theater', select: 'name' },
        { path: 'room', select: 'name' },
      ],
    })
    .sort({ paidAt: -1, createdAt: -1 });

  // Lọc thêm theo rạp và phim nếu có tham số
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tickets = rawTickets.filter((t: any) => {
    if (filters.theaterId && filters.theaterId !== 'all') {
      const tId = t.showtime?.theater?._id?.toString() || t.showtime?.theater?.toString();
      if (tId !== filters.theaterId) return false;
    }
    if (filters.movieId && filters.movieId !== 'all') {
      const mId = t.showtime?.movie?._id?.toString() || t.showtime?.movie?.toString();
      if (mId !== filters.movieId) return false;
    }
    return true;
  });

  // Tổng tiền nhập kho trong kỳ (lọc theo ngày nhập, không phải ngày bán vé).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const importDateQuery: Record<string, any> = {};
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    importDateQuery.$gte = start;
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    importDateQuery.$lte = end;
  }
  const importMatch =
    Object.keys(importDateQuery).length > 0 ? { importDate: importDateQuery } : {};
  const importAgg = await ImportReceipt.aggregate([
    { $match: importMatch },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const importCost = Number(importAgg[0]?.total) || 0;

  let totalRevenue = 0;
  let totalSeats = 0;
  let totalCombos = 0;
  let totalDiscount = 0;
  let comboRevenue = 0;
  let comboCost = 0;

  const timelineMap = new Map<
    string,
    { revenue: number; cost: number; profit: number; ticketCount: number }
  >();
  const movieMap = new Map<string, { title: string; revenue: number; ticketCount: number }>();
  const theaterMap = new Map<string, { name: string; revenue: number; ticketCount: number }>();
  const paymentMethodMap = new Map<string, { revenue: number; count: number }>();
  const comboMap = new Map<
    string,
    { name: string; quantitySold: number; revenue: number; cost: number }
  >();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const details: RevenueDetailItem[] = tickets.map((t: any) => {
    const revenueAmount = Number(t.totalAmount) || 0;
    const discountAmount = Number(t.discount) || 0;
    const seatsList = Array.isArray(t.seats) ? t.seats : [];
    const combosList = Array.isArray(t.combos) ? t.combos : [];

    const comboSum = combosList.reduce(
      (sum: number, c: any) => sum + (Number(c.lineTotal) || Number(c.unitPrice) * Number(c.quantity) || 0),
      0
    );
    const comboQty = combosList.reduce(
      (qty: number, c: any) => qty + (Number(c.quantity) || 0),
      0
    );
    const comboCostAmount = combosList.reduce((sum: number, c: any) => {
      const quantity = Number(c.quantity) || 0;
      const storedCost = Number(c.costTotal);
      if (Number.isFinite(storedCost)) return sum + storedCost;
      return sum + (Number(c.unitCost) || 0) * quantity;
    }, 0);

    const ticketAmt = Math.max(0, revenueAmount + discountAmount - comboSum);
    const ticketGrossProfit = revenueAmount - comboCostAmount;

    totalRevenue += revenueAmount;
    totalSeats += seatsList.length;
    totalCombos += comboQty;
    totalDiscount += discountAmount;
    comboRevenue += comboSum;
    comboCost += comboCostAmount;

    // Combo aggregation: số lượng bán, doanh thu, giá vốn, lợi nhuận theo combo
    for (const comboLine of combosList) {
      const comboId = String(comboLine.comboId || 'unknown');
      const comboName = comboLine.name || 'Combo khác';
      const quantity = Number(comboLine.quantity) || 0;
      const lineRevenue =
        Number(comboLine.lineTotal) ||
        (Number(comboLine.unitPrice) || 0) * quantity;
      const storedCost = Number(comboLine.costTotal);
      const lineCost = Number.isFinite(storedCost)
        ? storedCost
        : (Number(comboLine.unitCost) || 0) * quantity;

      const currentCombo =
        comboMap.get(comboId) ||
        { name: comboName, quantitySold: 0, revenue: 0, cost: 0 };
      currentCombo.quantitySold += quantity;
      currentCombo.revenue += lineRevenue;
      currentCombo.cost += lineCost;
      comboMap.set(comboId, currentCombo);
    }

    // Timeline aggregation (theo ngày YYYY-MM-DD)
    const dateObj = t.paidAt ? new Date(t.paidAt) : new Date(t.createdAt);
    const dateKey = dateObj.toISOString().split('T')[0];
    const curTimeline =
      timelineMap.get(dateKey) || { revenue: 0, cost: 0, profit: 0, ticketCount: 0 };
    curTimeline.revenue += revenueAmount;
    curTimeline.cost += comboCostAmount;
    curTimeline.profit += ticketGrossProfit;
    curTimeline.ticketCount += 1;
    timelineMap.set(dateKey, curTimeline);

    // Movie aggregation
    const movieId = t.showtime?.movie?._id?.toString() || 'unknown';
    const movieTitle = t.showtime?.movie?.title || 'Phim khác';
    const curMovie = movieMap.get(movieId) || { title: movieTitle, revenue: 0, ticketCount: 0 };
    curMovie.revenue += revenueAmount;
    curMovie.ticketCount += 1;
    movieMap.set(movieId, curMovie);

    // Theater aggregation
    const theaterId = t.showtime?.theater?._id?.toString() || 'unknown';
    const theaterName = t.showtime?.theater?.name || 'Rạp Fivecore';
    const curTheater = theaterMap.get(theaterId) || { name: theaterName, revenue: 0, ticketCount: 0 };
    curTheater.revenue += revenueAmount;
    curTheater.ticketCount += 1;
    theaterMap.set(theaterId, curTheater);

    // Payment method aggregation
    const payMethod = t.paymentMethod || 'VietQR / SePay';
    const curPay = paymentMethodMap.get(payMethod) || { revenue: 0, count: 0 };
    curPay.revenue += revenueAmount;
    curPay.count += 1;
    paymentMethodMap.set(payMethod, curPay);

    return {
      _id: t._id.toString(),
      code: t.code || `TKT-${t._id.toString().slice(-8).toUpperCase()}`,
      paidAt: t.paidAt || t.createdAt,
      movieTitle,
      theaterName,
      roomName: t.showtime?.room?.name || 'Phòng chiếu',
      customerName: t.user?.fullName || 'Khách vãng lai',
      customerEmail: t.user?.email || 'N/A',
      customerPhone: t.user?.phone || 'N/A',
      seats: seatsList,
      seatCount: seatsList.length,
      combos: combosList.map((c: any) => ({
        name: c.name,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        lineTotal: c.lineTotal || c.unitPrice * c.quantity,
      })),
      comboTotal: comboSum,
      comboCost: comboCostAmount,
      grossProfit: ticketGrossProfit,
      ticketAmount: ticketAmt,
      discount: discountAmount,
      totalAmount: revenueAmount,
      paymentMethod: payMethod,
    };
  });

  const ticketRevenue = Math.max(0, totalRevenue - comboRevenue);
  const totalTickets = tickets.length;
  const averageOrderValue = totalTickets > 0 ? Math.round(totalRevenue / totalTickets) : 0;

  // Sắp xếp timeline theo ngày tăng dần
  const timeline: RevenueTimelineItem[] = Array.from(timelineMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.profit,
      ticketCount: data.ticketCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Sắp xếp theo phim có doanh thu cao nhất giảm dần
  const byMovie: RevenueByMovieItem[] = Array.from(movieMap.entries())
    .map(([movieId, data]) => ({
      movieId,
      movieTitle: data.title,
      revenue: data.revenue,
      ticketCount: data.ticketCount,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Sắp xếp theo rạp có doanh thu cao nhất giảm dần
  const byTheater: RevenueByTheaterItem[] = Array.from(theaterMap.entries())
    .map(([theaterId, data]) => ({
      theaterId,
      theaterName: data.name,
      revenue: data.revenue,
      ticketCount: data.ticketCount,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Phân bổ theo phương thức thanh toán
  const byPaymentMethod: RevenueByPaymentMethodItem[] = Array.from(paymentMethodMap.entries())
    .map(([method, data]) => ({
      method,
      revenue: data.revenue,
      count: data.count,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Hiệu quả kinh doanh bắp nước theo từng combo
  const byCombo: RevenueByComboItem[] = Array.from(comboMap.entries())
    .map(([comboId, data]) => ({
      comboId,
      comboName: data.name,
      quantitySold: data.quantitySold,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.revenue - data.cost,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Cơ cấu doanh thu: Tiền vé vs Combo bắp nước
  const revenueStructure: RevenueStructureItem[] = [
    { type: 'Tiền vé xem phim', amount: ticketRevenue },
    { type: 'Combo bắp nước', amount: comboRevenue },
  ];

  const grossProfit = totalRevenue - comboCost;
  const grossMargin =
    totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;

  return {
    summary: {
      totalRevenue,
      totalTickets,
      totalSeats,
      totalCombos,
      totalDiscount,
      averageOrderValue,
      ticketRevenue,
      comboRevenue,
      comboCost,
      grossProfit,
      grossMargin,
      importCost,
    },
    timeline,
    byMovie,
    byTheater,
    byPaymentMethod,
    byCombo,
    revenueStructure,
    details,
  };
};

