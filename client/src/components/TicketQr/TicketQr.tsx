import QRCode from 'react-qr-code'

interface TicketQrProps {
  /** Chuỗi nội dung QR do backend trả về (vd: JSON { v, ticketId, code, ... }) */
  value: string
  size?: number
  /** Hiển thị khung trắng + bo góc (mặc định true) */
  framed?: boolean
  className?: string
}

/**
 * Render mã QR từ chuỗi string nhận được từ Backend.
 * Dùng SVG nên không bị vỡ nét khi phóng to trong modal vé.
 */
export default function TicketQr({
  value,
  size = 160,
  framed = true,
  className = '',
}: TicketQrProps) {
  const qr = (
    <QRCode
      value={value}
      size={size}
      level="M"
      bgColor="#FFFFFF"
      fgColor="#111111"
      title="Mã QR vé điện tử"
    />
  )

  if (!framed) return <div className={className}>{qr}</div>

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-white p-3 shadow-lg shadow-black/30 ${className}`}
    >
      {qr}
    </div>
  )
}
