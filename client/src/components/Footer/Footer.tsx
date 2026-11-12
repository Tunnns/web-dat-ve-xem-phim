import { Film, Phone, Mail, MapPin, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Col */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
                <Film className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Five<span className="text-brand-500">core</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              Hệ thống đặt vé xem phim trực tuyến hàng đầu. Trải nghiệm rạp chiếu chuẩn quốc tế với hình ảnh sắc nét và âm thanh Dolby Atmos sống động.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <Heart className="h-4 w-4 text-brand-500 fill-brand-500" />
              <span>Phát triển bởi Fivecore Dev Team</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Khám phá</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition">Phim đang chiếu</Link>
              </li>
              <li>
                <Link to="/?tab=coming_soon" className="hover:text-white transition">Phim sắp chiếu</Link>
              </li>
              <li>
                <Link to="/showtimes" className="hover:text-white transition">Lịch chiếu phim</Link>
              </li>
              <li>
                <Link to="/promotions" className="hover:text-white transition">Ưu đãi & Tin tức</Link>
              </li>
              <li>
                <Link to="/checkout" className="hover:text-white transition">Thanh toán vé</Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Chính sách & Hỗ trợ</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><span className="hover:text-white cursor-pointer transition">Quy chế hoạt động</span></li>
              <li><span className="hover:text-white cursor-pointer transition">Chính sách bảo mật</span></li>
              <li><span className="hover:text-white cursor-pointer transition">Điều khoản sử dụng</span></li>
              <li><span className="hover:text-white cursor-pointer transition">Chính sách đổi trả / hoàn vé</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Liên hệ hỗ trợ</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-brand-400 flex-shrink-0" />
                <span>Hotline: 1900 6017 (8:00 - 22:00)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-brand-400 flex-shrink-0" />
                <span>support@fivecore.vn</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" />
                <span>Landmark 81, 720A Điện Biên Phủ, P. 22, Q. Bình Thạnh, TP.HCM</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-zinc-800/80 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© 2026 Fivecore Cinema. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Bản quyền nội dung thuộc Fivecore</span>
            <span>·</span>
            <span>Hệ thống vé điện tử QR Code</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
