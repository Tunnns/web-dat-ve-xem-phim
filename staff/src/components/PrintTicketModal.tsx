import React, { useState } from 'react';
import { Printer, CheckCircle2, X, Ticket as TicketIcon, Popcorn, Layers } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Ticket } from '../types';

interface PrintTicketModalProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export const PrintTicketModal: React.FC<PrintTicketModalProps> = ({ ticket, onClose }) => {
  const [selectedPreviewTab, setSelectedPreviewTab] = useState<number | 'all'>('all');

  if (!ticket) return null;

  const isComboOnly =
    ticket.orderType === 'combo_only' ||
    (!ticket.showtime && (!ticket.seats || ticket.seats.length === 0));
  const seats = !isComboOnly && Array.isArray(ticket.seats) ? ticket.seats : [];
  const hasCombos = Array.isArray(ticket.combos) && ticket.combos.length > 0;
  const totalStubs = seats.length + (hasCombos ? 1 : 0);

  const handlePrint = () => {
    window.print();
  };

  const showtimeDate = ticket.showtime?.startTime ? new Date(ticket.showtime.startTime) : new Date(ticket.createdAt || Date.now());
  const timeStr = showtimeDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = showtimeDate.toLocaleDateString('vi-VN');

  const theaterName = ticket.showtime?.theater?.name || ticket.theater?.name || 'FIVECORE CINEMA';
  const theaterAddress = ticket.showtime?.theater?.address || ticket.theater?.address || 'Quầy vé rạp';

  const comboTotal = (ticket.combos || []).reduce((acc, c) => acc + (c.lineTotal || 0), 0);
  const ticketOnlyTotal = Math.max(0, ticket.totalAmount - comboTotal);
  const singleTicketPrice = seats.length > 0 ? Math.round(ticketOnlyTotal / seats.length) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl text-zinc-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="no-print absolute right-4 top-4 z-10 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          title="Đóng modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Success Header */}
        <div className="no-print p-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isComboOnly ? 'Xuất hóa đơn bắp nước thành công!' : 'Xuất vé tại quầy thành công!'}
              </h3>
              <p className="text-xs text-zinc-400">
                {seats.length > 0 && (
                  <>
                    Đơn gồm <strong className="text-rose-400">{seats.length} vé xem phim</strong>
                    {hasCombos ? ' + ' : ''}
                  </>
                )}
                {hasCombos && (
                  <strong className="text-amber-400">1 phiếu nhận bắp nước</strong>
                )}
                {' '}(In <strong className="text-emerald-400">{totalStubs} cuống</strong>)
              </p>
            </div>
          </div>

          {totalStubs > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedPreviewTab('all')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  selectedPreviewTab === 'all'
                    ? 'bg-rose-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Xem tất cả ({totalStubs} cuống)</span>
              </button>
              {seats.map((seat, idx) => (
                <button
                  key={seat}
                  onClick={() => setSelectedPreviewTab(idx)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    selectedPreviewTab === idx
                      ? 'bg-rose-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <TicketIcon className="h-3.5 w-3.5" />
                  <span>
                    Vé {idx + 1}: {seat}
                  </span>
                </button>
              ))}
              {hasCombos && (
                <button
                  onClick={() => setSelectedPreviewTab(seats.length)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    selectedPreviewTab === seats.length
                      ? 'bg-amber-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <Popcorn className="h-3.5 w-3.5" />
                  <span>Phiếu Bắp Nước</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Container chứa tất cả các Cuống Vé */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div id="printable-tickets-wrapper" className="space-y-6">
            {/* 1. In từng vé rời rạc cho từng ghế ngồi */}
            {seats.map((seat, index) => {
              const isHiddenInPreview =
                selectedPreviewTab !== 'all' && selectedPreviewTab !== index;

              const subTicketCode = `${ticket.code || ticket._id}-${seat}`;
              const qrPayload = JSON.stringify({
                v: 1,
                ticketId: ticket._id,
                code: ticket.code || ticket._id,
                subCode: subTicketCode,
                seat,
                index: index + 1,
                total: seats.length,
              });

              return (
                <div
                  key={seat}
                  className={`ticket-stub rounded-xl border border-dashed border-zinc-700 bg-zinc-950 p-5 text-zinc-100 shadow-lg ${
                    isHiddenInPreview ? 'no-print hidden' : ''
                  }`}
                  style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
                >
                  <div className="text-center border-b border-zinc-800 pb-2">
                    <h2 className="text-base font-black tracking-wider uppercase text-rose-500">
                      {theaterName}
                    </h2>
                    <p className="text-[10px] text-zinc-400">{theaterAddress}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
                      <span>MÃ ĐƠN: {ticket.code || ticket._id}</span>
                      <span className="font-bold text-emerald-400">
                        VÉ {index + 1} / {seats.length}
                      </span>
                    </div>
                  </div>

                  <div className="my-2.5 space-y-1 text-xs">
                    <div className="text-sm font-black text-white uppercase line-clamp-1">
                      {ticket.showtime?.movie?.title || 'Phim'}
                    </div>
                    <div className="flex justify-between text-zinc-300">
                      <span>
                        Suất: <strong className="text-white">{timeStr}</strong> ({dateStr})
                      </span>
                      <span>
                        Phòng: <strong className="text-white">{ticket.showtime?.room?.name || 'Phòng 1'}</strong>
                      </span>
                    </div>

                    <div className="my-2 rounded-lg border-2 border-rose-500/80 bg-rose-500/10 p-2 text-center">
                      <div className="text-[10px] uppercase font-semibold text-rose-400">
                        VỊ TRÍ GHẾ NGỒI
                      </div>
                      <div className="text-2xl font-black tracking-wider text-rose-500">
                        {seat}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Đơn giá: {singleTicketPrice.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-col items-center justify-center border-t border-zinc-800 pt-2 text-center">
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <QRCode
                        value={qrPayload}
                        size={100}
                        level="M"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    </div>
                    <div className="mt-1 font-mono text-[11px] font-bold tracking-wider text-zinc-300">
                      {subTicketCode}
                    </div>
                    <p className="text-[9px] text-zinc-400 mt-0.5">
                      1 vé chỉ dành cho 01 người qua cửa kiểm soát
                    </p>
                  </div>
                </div>
              );
            })}

            {/* 2. Phiếu nhận Combo Bắp Nước */}
            {hasCombos && (
              <div
                className={`ticket-stub rounded-xl border border-dashed border-amber-600/70 bg-zinc-950 p-5 text-zinc-100 shadow-lg ${
                  selectedPreviewTab !== 'all' && selectedPreviewTab !== seats.length
                    ? 'no-print hidden'
                    : ''
                }`}
                style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
              >
                <div className="text-center border-b border-zinc-800 pb-2">
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    <Popcorn className="h-3.5 w-3.5" />
                    <span>{theaterName} — QUẦY BẮP NƯỚC</span>
                  </div>
                  <h2 className="text-base font-black tracking-wider uppercase text-amber-500">
                    {isComboOnly ? 'HÓA ĐƠN & PHIẾU BẮP NƯỚC' : 'PHIẾU NHẬN BẮP NƯỚC'}
                  </h2>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
                    <span>MÃ ĐƠN: {ticket.code || ticket._id}</span>
                    <span className="font-bold text-amber-400">F&B VOUCHER</span>
                  </div>
                </div>

                <div className="my-3 space-y-1.5 text-xs">
                  <div className="font-semibold text-zinc-300 mb-1">Các món đã đặt:</div>
                  {ticket.combos!.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded bg-zinc-900/80 px-2.5 py-1.5 text-zinc-200"
                    >
                      <div>
                        <span className="font-medium">
                          {c.name} <strong className="text-amber-400">x{c.quantity}</strong>
                        </span>
                        {c.selectedFlavor && (
                          <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
                            Vị: {c.selectedFlavor}
                          </span>
                        )}
                      </div>
                      <span>{c.lineTotal?.toLocaleString('vi-VN')} đ</span>
                    </div>
                  ))}
                  {ticket.discount && ticket.discount > 0 ? (
                    <div className="flex justify-between text-emerald-400 text-xs pt-1">
                      <span>Giảm giá ({ticket.voucherCode}):</span>
                      <span>-{ticket.discount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  ) : null}
                  <div className="mt-2 flex justify-between border-t border-zinc-800 pt-1.5 font-bold text-sm text-white">
                    <span>{isComboOnly ? 'Tổng thanh toán:' : 'Tổng tiền bắp nước:'}</span>
                    <span className="text-amber-400">
                      {(isComboOnly ? ticket.totalAmount : comboTotal).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col items-center justify-center border-t border-zinc-800 pt-2 text-center">
                  <div className="rounded-lg bg-white p-2 shadow-sm">
                    <QRCode
                      value={JSON.stringify({
                        type: 'FNB',
                        ticketId: ticket._id,
                        code: ticket.code || ticket._id,
                        items: ticket.combos?.map((c) => ({
                          name: c.name,
                          qty: c.quantity,
                          flavor: c.selectedFlavor,
                        })),
                      })}
                      size={100}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>
                  <div className="mt-1 font-mono text-[11px] font-bold tracking-wider text-amber-300">
                    FNB-{ticket.code || ticket._id}
                  </div>
                  <p className="text-[9px] text-zinc-400 mt-0.5">
                    Xuất trình phiếu này tại quầy Bắp Nước để nhận combo
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="no-print p-4 border-t border-zinc-800 bg-zinc-950/60 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 space-y-0.5">
            <div>
              Tổng thanh toán:{' '}
              <strong className="text-rose-400 text-sm">
                {ticket.totalAmount?.toLocaleString('vi-VN')} đ
              </strong>{' '}
              ({ticket.paymentMethod === 'cash' ? 'Tiền mặt' : ticket.paymentMethod})
            </div>
            {ticket.cashReceived ? (
              <div className="text-[11px] text-zinc-500">
                Khách đưa: {ticket.cashReceived.toLocaleString('vi-VN')} đ · Tiền thừa:{' '}
                <span className="text-emerald-400 font-semibold">
                  {(ticket.cashChange || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>In Tất Cả ({totalStubs} Cuống)</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-all"
            >
              Đóng & Bán tiếp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
