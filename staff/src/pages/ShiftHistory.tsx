import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Search,
  DollarSign,
  Ticket as TicketIcon,
  CheckCircle2,
  Clock,
  Printer,
  RefreshCw,
  QrCode,
  Banknote,
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';
import { Ticket } from '../types';
import { PrintTicketModal } from '../components/PrintTicketModal';

interface ShiftSummary {
  totalTickets: number;
  totalRevenue: number;
  cashRevenue: number;
  qrRevenue: number;
  checkedInCount: number;
}

export const ShiftHistory: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState<ShiftSummary>({
    totalTickets: 0,
    totalRevenue: 0,
    cashRevenue: 0,
    qrRevenue: 0,
    checkedInCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reprintTicket, setReprintTicket] = useState<Ticket | null>(null);

  const fetchHistory = () => {
    setLoading(true);
    apiClient
      .get('/tickets/counter-history', {
        params: { date: selectedDate },
      })
      .then((res) => {
        const { tickets: list = [], summary: stats } = res.data.data || {};
        setTickets(list);
        if (stats) setSummary(stats);
      })
      .catch((err) => {
        console.error('Lỗi tải lịch sử:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedDate]);

  // Lọc theo tìm kiếm
  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.code?.toLowerCase().includes(q) ||
      t.showtime?.movie?.title?.toLowerCase().includes(q) ||
      t.customerPhone?.includes(q) ||
      t.customerName?.toLowerCase().includes(q) ||
      t.seats?.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Lịch Sử & Báo Cáo Ca Trực</h2>
            <p className="text-xs text-zinc-400">
              Thống kê doanh thu tại quầy và tra cứu vé để in lại
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm text-zinc-200 focus:border-rose-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="rounded-xl border border-zinc-800 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            Hôm nay
          </button>
          <button
            onClick={fetchHistory}
            className="rounded-xl border border-zinc-800 bg-zinc-800 p-2.5 text-zinc-300 hover:bg-zinc-700"
            title="Tải lại"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Thống kê Card tóm tắt ca trực */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Tổng vé */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Vé Đã Bán</span>
            <TicketIcon className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white">{summary.totalTickets}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Đơn thanh toán hoàn tất</div>
        </div>

        {/* Card 2: Tiền mặt */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Tiền Mặt Tại Quầy</span>
            <Banknote className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {summary.cashRevenue.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Khách trả tiền mặt</div>
        </div>

        {/* Card 3: VietQR */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Doanh Thu VietQR</span>
            <QrCode className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {summary.qrRevenue.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Quét mã chuyển khoản</div>
        </div>

        {/* Card 4: Đã soát vé */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Lượt Khách Đã Check-in</span>
            <CheckCircle2 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{summary.checkedInCount}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Đã vào phòng chiếu</div>
        </div>
      </div>

      {/* Tra cứu vé & Bảng danh sách */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Danh Sách Vé Ngày {selectedDate} ({filteredTickets.length})
          </h3>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã vé, phim, SĐT..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-zinc-500">Đang tải danh sách vé...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            Không tìm thấy vé nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-3 px-3 font-semibold">MÃ VÉ</th>
                  <th className="py-3 px-3 font-semibold">PHIM & SUẤT CHIẾU</th>
                  <th className="py-3 px-3 font-semibold">GHẾ</th>
                  <th className="py-3 px-3 font-semibold">KHÁCH HÀNG</th>
                  <th className="py-3 px-3 font-semibold">TỔNG TIỀN</th>
                  <th className="py-3 px-3 font-semibold">HÌNH THỨC</th>
                  <th className="py-3 px-3 font-semibold">CHECK-IN</th>
                  <th className="py-3 px-3 font-semibold text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredTickets.map((t) => {
                  const time = t.showtime?.startTime
                    ? new Date(t.showtime.startTime).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--';

                  return (
                    <tr key={t._id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-rose-400">
                        {t.code || t._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-zinc-200">
                          {t.showtime?.movie?.title || 'Phim'}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {time} - {t.showtime?.room?.name}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {t.seats?.join(', ')}
                      </td>
                      <td className="py-3 px-3 text-zinc-300">
                        {t.customerName || t.user?.fullName || 'Khách vãng lai'}
                        {t.customerPhone && (
                          <div className="text-[11px] text-zinc-500">{t.customerPhone}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-rose-400">
                        {t.totalAmount?.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            t.paymentMethod === 'cash'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-cyan-500/10 text-cyan-400'
                          }`}
                        >
                          {t.paymentMethod === 'cash' ? 'Tiền mặt' : t.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {t.isUsed ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Đã vào</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-500">Chưa vào</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setReprintTicket(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:border-rose-500 hover:text-white transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>In lại</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal In lại vé */}
      <PrintTicketModal
        ticket={reprintTicket}
        onClose={() => setReprintTicket(null)}
      />
    </div>
  );
};
