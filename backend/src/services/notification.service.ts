import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket';
import '../models/Movie';
import '../models/Theater';
import '../models/Room';
import '../models/Showtime';
import '../models/User';

let transporter: Transporter | null = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;

  if (user && pass) {
    if (host) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      // Mac dinh su dung service Gmail voi Mat khau ung dung (App Password 16 ky tu)
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }
  } else {
    // Neu chua cau hinh EMAIL_USER / EMAIL_PASS trong .env thi dung jsonTransport an toan khong gay crash app
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    } as any);
  }

  return transporter;
};

export interface SendTicketNotificationOptions {
  ticketId: string | mongoose.Types.ObjectId;
  recipientEmail?: string;
}

export const sendTicketNotification = async (options: SendTicketNotificationOptions): Promise<{
  emailSent: boolean;
  message?: string;
}> => {
  try {
    const { ticketId, recipientEmail } = options;

    const ticket = await Ticket.findById(ticketId).populate([
      { path: 'user', select: 'fullName email phone' },
      {
        path: 'showtime',
        select: 'movie theater room startTime endTime price format',
        populate: [
          { path: 'movie', select: 'title poster duration genre ageRating' },
          { path: 'theater', select: 'name address hotline' },
          { path: 'room', select: 'name' },
        ],
      },
    ]);

    if (!ticket) {
      return { emailSent: false, message: 'Không tìm thấy vé' };
    }

    const targetUser = ticket.user as any;
    const targetShowtime = ticket.showtime as any;
    const targetMovie = targetShowtime?.movie as any;
    const targetTheater = targetShowtime?.theater as any;
    const targetRoom = targetShowtime?.room as any;

    const targetEmail = recipientEmail || targetUser?.email;

    if (!targetEmail) {
      console.log(`[Notification] Vé ${ticket._id} không có địa chỉ email người nhận, bỏ qua gửi thư.`);
      return { emailSent: false, message: 'Vé không có địa chỉ email' };
    }

    const movieTitle = targetMovie?.title || 'Phim Chiếu Rạp';
    const theaterName = targetTheater?.name || 'Fivecore Cinema';
    const roomName = targetRoom?.name || 'Phòng chiếu';
    const seatsList = (ticket.seats || []).join(', ');
    const showtimeDate = targetShowtime?.startTime
      ? new Date(targetShowtime.startTime).toLocaleDateString('vi-VN')
      : '';
    const showtimeTime = targetShowtime?.startTime
      ? new Date(targetShowtime.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '';
    const ticketCode = ticket.code || String(ticket._id);
    const invoiceCode = ticket.paymentReference || 'N/A';
    const totalFormatted = (ticket.totalAmount || 0).toLocaleString('vi-VN') + 'đ';

    const mailClient = await getTransporter();
    const mailOptions: SendMailOptions = {
      from: `"Fivecore Cinema" <${process.env.EMAIL_USER || 'no-reply@fivecore.vn'}>`,
      to: targetEmail,
      subject: `[Fivecore Cinema] Xác nhận đặt vé thành công - Mã vé: ${ticketCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
          <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">FIVECORE CINEMA</h1>
            <p style="margin: 6px 0 0; font-size: 13px; color: #ffe4e6;">XÁC NHẬN ĐẶT VÉ ĐIỆN TỬ THÀNH CÔNG</p>
          </div>

          <div style="padding: 24px;">
            <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; text-align: center; border: 1px dashed #475569; margin-bottom: 20px;">
              <span style="display: block; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Mã Đặt Vé (Ticket Code)</span>
              <span style="display: block; font-family: monospace; font-size: 26px; font-weight: 800; color: #38bdf8; margin: 8px 0; letter-spacing: 2px;">${ticketCode}</span>
              <span style="display: block; font-size: 12px; color: #fbbf24;">Mã hóa đơn: <strong>${invoiceCode}</strong></span>
            </div>

            <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 16px; font-size: 17px; color: #ffffff; border-bottom: 1px solid #334155; padding-bottom: 8px;">${movieTitle}</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; width: 35%;">Rạp chiếu:</td>
                  <td style="padding: 6px 0; color: #f1f5f9; font-weight: 600;">${theaterName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Phòng chiếu:</td>
                  <td style="padding: 6px 0; color: #f1f5f9; font-weight: 600;">${roomName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Suất chiếu:</td>
                  <td style="padding: 6px 0; color: #38bdf8; font-weight: 600;">${showtimeTime} · Ngày ${showtimeDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Ghế ngồi:</td>
                  <td style="padding: 6px 0; color: #f43f5e; font-weight: 700; font-size: 15px;">${seatsList}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Tổng tiền:</td>
                  <td style="padding: 6px 0; color: #4ade80; font-weight: 700; font-size: 15px;">${totalFormatted}</td>
                </tr>
              </table>
            </div>

            ${
              ticket.qrCode
                ? `
              <div style="text-align: center; margin-bottom: 20px; background-color: #ffffff; padding: 16px; border-radius: 12px; display: inline-block; width: fit-content; margin-left: auto; margin-right: auto;">
                <img src="${ticket.qrCode}" alt="QR Soát vé" style="width: 160px; height: 160px; display: block;" />
                <span style="display: block; font-size: 11px; color: #0f172a; margin-top: 6px; font-weight: 600;">Quét mã này tại cổng soát vé</span>
              </div>
            `
                : ''
            }

            <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0;">• Vui lòng có mặt tại rạp trước giờ chiếu ít nhất 15 phút.</p>
              <p style="margin: 4px 0 0;">• Bạn có thể xuất trình email này hoặc quét mã QR trên điện thoại tại quầy / máy soát vé.</p>
            </div>
          </div>

          <div style="background-color: #020617; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b;">
            Fivecore Cinema · Hotline 1900 6017 · Chúc quý khách xem phim vui vẻ!
          </div>
        </div>
      `,
    };

    await mailClient.sendMail(mailOptions);
    console.log(`[Notification] Đã gửi email xác nhận vé ${ticketCode} tới ${targetEmail}`);
    return { emailSent: true };
  } catch (err: any) {
    console.error('[Notification] Lỗi gửi email vé:', err);
    return { emailSent: false, message: err.message };
  }
};
