import React from 'react';
import { Printer, CheckCircle2, X } from 'lucide-react';
import { Ticket } from '../types';

interface PrintTicketModalProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export const PrintTicketModal: React.FC<PrintTicketModalProps> = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const showtimeDate = ticket.showtime?.startTime ? new Date(ticket.showtime.startTime) : new Date();
  const timeStr = showtimeDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = showtimeDate.toLocaleDateString('vi-VN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl text-zinc-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="no-print absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Success Header */}
        <div className="no-print mb-4 flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Xuất vé tại quầy thành công!</h3>
            <p className="text-xs text-zinc-400">Vé đã được lưu vào hệ thống và kích hoạt</p>
          </div>
        </div>

        {/* Printable Ticket Section */}
        <div
          id="printable-ticket"
          className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950 p-5 text-zinc-100"
        >
          {/* Cinema Branding */}
          <div className="text-center border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-black tracking-wider uppercase text-rose-500">
              {ticket.showtime?.theater?.name || 'FIVECORE CINEMA'}
            </h2>
            <p className="text-[11px] text-zinc-400">
              {ticket.showtime?.theater?.address || 'Quầy vé rạp'}
            </p>
            <div className="mt-2 text-xs font-mono font-bold tracking-widest text-emerald-400">
              MÃ VÉ: {ticket.code || ticket._id}
            </div>
            {ticket.paymentReference && (
              <div className="mt-1 text-[11px] font-mono text-zinc-400">
                MÃ HÓA ĐƠN: <strong className="text-zinc-200">{ticket.paymentReference}</strong>
              </div>
            )}
          </div>

          {/* Movie Details */}
          <div className="my-3 space-y-1.5 text-sm">
            <div className="text-base font-extrabold text-white">
              {ticket.showtime?.movie?.title || 'Phim'}
            </div>
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Suất: <strong className="text-white">{timeStr}</strong> ({dateStr})</span>
              <span>Phòng: <strong className="text-white">{ticket.showtime?.room?.name || 'Phòng 1'}</strong></span>
            </div>
            <div className="rounded-lg bg-zinc-900 p-2 text-center text-base font-bold text-rose-400">
              Ghế: {ticket.seats.join(', ')}
            </div>
          </div>

          {/* Combos if any */}
          {ticket.combos && ticket.combos.length > 0 && (
            <div className="my-3 border-t border-zinc-800 pt-2 text-xs">
              <div className="font-semibold text-zinc-400 mb-1">Bắp nước kèm theo:</div>
              {ticket.combos.map((c, i) => (
                <div key={i} className="flex justify-between text-zinc-300">
                  <span>{c.name} x{c.quantity}</span>
                  <span>{c.lineTotal?.toLocaleString('vi-VN')} đ</span>
                </div>
              ))}
            </div>
          )}

          {/* Pricing & Payment Method */}
          <div className="mt-3 border-t border-dashed border-zinc-800 pt-2 text-xs space-y-1">
            <div className="flex justify-between font-bold text-sm text-white">
              <span>TỔNG TIỀN:</span>
              <span className="text-rose-400">{ticket.totalAmount?.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Hình thức:</span>
              <span className="uppercase font-semibold text-zinc-300">
                {ticket.paymentMethod === 'cash' ? 'Tiền mặt tại quầy' : ticket.paymentMethod}
              </span>
            </div>
            {ticket.customerName && (
              <div className="flex justify-between text-zinc-400">
                <span>Khách hàng:</span>
                <span className="font-semibold text-zinc-200">
                  {ticket.customerName} {ticket.customerPhone ? `(${ticket.customerPhone})` : ''}
                </span>
              </div>
            )}
            {ticket.soldBy && (
              <div className="flex justify-between text-zinc-400">
                <span>Thu ngân:</span>
                <span className="font-semibold text-zinc-200">{ticket.soldBy.fullName || ticket.soldBy.email}</span>
              </div>
            )}
            {ticket.cashReceived && (
              <div className="flex justify-between text-zinc-400">
                <span>Khách đưa:</span>
                <span>{ticket.cashReceived.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            {ticket.cashChange && ticket.cashChange > 0 ? (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Tiền thừa:</span>
                <span>{ticket.cashChange.toLocaleString('vi-VN')} đ</span>
              </div>
            ) : null}
          </div>

          {/* QR Code / Barcode representation */}
          <div className="mt-4 flex flex-col items-center justify-center border-t border-zinc-800 pt-3">
            {ticket.qrCode ? (
              <img src={ticket.qrCode} alt="Ticket QR" className="h-28 w-28 rounded-lg bg-white p-1" />
            ) : (
              <div className="h-24 w-24 rounded bg-white flex items-center justify-center text-black font-mono text-[10px]">
                {ticket.code}
              </div>
            )}
            <span className="mt-1 text-[10px] text-zinc-400">Quét mã này tại cửa kiểm soát vào phòng chiếu</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="no-print mt-5 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 font-semibold text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>In Vé Ngay</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 font-medium text-zinc-300 hover:bg-zinc-700 transition-all"
          >
            Đóng & Bán vé tiếp
          </button>
        </div>
      </div>
    </div>
  );
};
