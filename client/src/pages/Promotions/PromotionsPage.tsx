import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Tag,
  Gift,
  Copy,
  Check,
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  Newspaper,
  Percent,
} from 'lucide-react'
import api from '../../api/axios'

interface VoucherItem {
  _id: string
  code: string
  description?: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  maxDiscount?: number | null
  minOrderValue: number
  startDate: string
  endDate: string
  isActive: boolean
}

const DEFAULT_VOUCHERS: VoucherItem[] = [
  {
    _id: 'v1',
    code: 'FIVECORENEW',
    description: 'Giảm 20% cho thành viên mới khi đặt vé lần đầu tiên',
    discountType: 'percent',
    discountValue: 20,
    maxDiscount: 50000,
    minOrderValue: 100000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isActive: true,
  },
  {
    _id: 'v2',
    code: 'HAPPYWED',
    description: 'Giảm trực tiếp 30.000đ vào ngày Thứ Tư hàng tuần',
    discountType: 'fixed',
    discountValue: 30000,
    maxDiscount: null,
    minOrderValue: 80000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isActive: true,
  },
  {
    _id: 'v3',
    code: 'COMBOVIP',
    description: 'Giảm 15% tổng hóa đơn khi đặt từ 2 vé kèm combo bắp nước',
    discountType: 'percent',
    discountValue: 15,
    maxDiscount: 40000,
    minOrderValue: 150000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isActive: true,
  },
  {
    _id: 'v4',
    code: 'STUDENT50',
    description: 'Ưu đãi đặc quyền học sinh sinh viên đồng giá vé 50k',
    discountType: 'fixed',
    discountValue: 40000,
    maxDiscount: null,
    minOrderValue: 90000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isActive: true,
  },
]

interface NewsArticle {
  id: string
  title: string
  excerpt: string
  content: string
  category: string
  imageUrl: string
  date: string
  readTime: string
}

const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'n1',
    title: 'Thứ 4 Vui Vẻ - Xem Phim Thả Ga Với Đồng Giá Vé Chỉ Từ 50.000đ',
    category: 'Ưu Đãi Tuần',
    excerpt: 'Tận hưởng ngày hội điện ảnh giữa tuần cùng bạn bè và người thân với mức giá ưu đãi áp dụng trên toàn bộ cụm rạp Fivecore.',
    content: 'Chương trình Thứ Tư Vui Vẻ được Fivecore Cinema áp dụng từ 08:00 sáng đến 23:00 tối mỗi thứ Tư hàng tuần. Khách hàng khi đặt vé qua website hoặc ứng dụng sẽ được hưởng mức giá đặc biệt chỉ 50.000đ cho ghế Tiêu Chuẩn và 65.000đ cho ghế VIP. Chương trình không áp dụng vào các ngày lễ Tết hoặc các suất chiếu Sneak Show đặc biệt.',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    date: '04/11/2026',
    readTime: '3 phút đọc',
  },
  {
    id: 'n2',
    title: 'Trải Nghiệm Công Nghệ Chiếu IMAX Laser & Âm Thanh Vòm Dolby Atmos Đỉnh Cao',
    category: 'Công Nghệ',
    excerpt: 'Hệ thống phòng chiếu thế hệ mới với màn hình cong cực đại cùng độ phân giải 4K sắc nét đem lại trải nghiệm nhập vai tuyệt đối.',
    content: 'Fivecore Cinema chính thức nâng cấp hệ thống phòng chiếu số 01 và 02 tại các chi nhánh trọng điểm sang công nghệ IMAX Laser. Máy chiếu kép cung cấp dải màu rộng hơn 50% so với thông thường kết hợp hệ thống 64 kênh âm thanh vòm Dolby Atmos tái hiện từng chuyển động tinh tế nhất của bộ phim.',
    imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
    date: '01/11/2026',
    readTime: '4 phút đọc',
  },
  {
    id: 'n3',
    title: 'Quyền Lợi Hội Viên Fivecore Club: Tích Điểm Đổi Vé & Bắp Nước Miễn Phí',
    category: 'Thành Viên',
    excerpt: 'Mỗi chi tiêu đều được tích lũy 10% điểm thưởng. Đạt hạng Vàng và Kim Cương nhận ngay combo bắp nước miễn phí mỗi tháng.',
    content: 'Tham gia Fivecore Club hoàn toàn miễn phí ngay trên website. Với mỗi 10.000đ chi tiêu, bạn tích lũy được 1 Điểm Sao. Tích lũy đủ 100 điểm đổi ngay 01 vé xem phim 2D bất kỳ vào các ngày trong tuần. Ngoài ra hội viên còn được nhận quà sinh nhật và cơ hội tham dự các buổi chiếu sớm độc quyền.',
    imageUrl: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800&auto=format&fit=crop&q=80',
    date: '28/10/2026',
    readTime: '2 phút đọc',
  },
  {
    id: 'n4',
    title: 'Lễ Hội Phim Bom Tấn Mùa Thu: Chuỗi Tác Phẩm Hành Động Không Thể Bỏ Lỡ',
    category: 'Tin Phim',
    excerpt: 'Điểm qua danh sách các siêu phẩm Hollywood và phim Việt chuẩn bị đổ bộ hệ thống phòng chiếu trong tháng này.',
    content: 'Mùa thu năm nay chứng kiến sự bùng nổ của hàng loạt dự án phim khoa học viễn tưởng, gián điệp và kinh dị. Hãy theo dõi trang Lịch Chiếu để nắm bắt thời gian mở bán vé sớm của các suất chiếu đầu tiên nhằm chọn được vị trí ghế đẹp nhất giữa khán phòng.',
    imageUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&auto=format&fit=crop&q=80',
    date: '25/10/2026',
    readTime: '5 phút đọc',
  },
]

export default function PromotionsPage() {
  const [activeTab, setActiveTab] = useState<'vouchers' | 'news'>('vouchers')
  const [vouchers, setVouchers] = useState<VoucherItem[]>(DEFAULT_VOUCHERS)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)

  useEffect(() => {
    async function loadVouchers() {
      try {
        const res = await api.get('/admin/vouchers')
        const data = res.data?.data ?? res.data
        if (Array.isArray(data) && data.length > 0) {
          const activeOnly = data.filter((v: any) => v.isActive !== false)
          if (activeOnly.length > 0) {
            setVouchers(activeOnly)
          }
        }
      } catch {
        // Giữ mock vouchers mặc định nếu offline
      }
    }
    loadVouchers()
  }, [])

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => {
      setCopiedCode(null)
    }, 2500)
  }

  const fmtCurrency = (n: number) => n.toLocaleString('vi-VN') + 'đ'

  return (
    <div className="min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Banner Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-brand-950/40 to-zinc-900 p-8 sm:p-12 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-3.5 py-1 text-xs font-semibold text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Đặc quyền khán giả Fivecore</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Ưu Đãi & Tin Tức Điện Ảnh
            </h1>
            <p className="text-sm sm:text-base text-zinc-300">
              Khám phá các chương trình khuyến mãi độc quyền, mã giảm giá vé phim, combo bắp nước và cập nhật tin tức điện ảnh nóng hổi nhất.
            </p>
          </div>
          <div className="absolute right-0 top-0 -bottom-10 w-96 bg-brand-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* Tab Switcher */}
        <div className="mt-8 flex items-center gap-3 border-b border-zinc-800 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('vouchers')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'vouchers'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Gift className="h-4 w-4" />
            <span>Mã giảm giá & Khuyến mãi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'news'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Newspaper className="h-4 w-4" />
            <span>Tin tức & Sự kiện</span>
          </button>
        </div>

        {/* Nội dung Tab: Mã giảm giá */}
        {activeTab === 'vouchers' && (
          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {vouchers.map((voucher) => (
                <div
                  key={voucher._id}
                  className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-md transition hover:border-brand-500/60 hover:shadow-xl"
                >
                  <div>
                    {/* Top Tag & Discount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400">
                          {voucher.discountType === 'percent' ? (
                            <Percent className="h-5 w-5" />
                          ) : (
                            <Tag className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <span className="text-xl font-extrabold text-white">
                            {voucher.discountType === 'percent'
                              ? `Giảm ${voucher.discountValue}%`
                              : `Giảm ${fmtCurrency(voucher.discountValue)}`}
                          </span>
                          {voucher.maxDiscount && (
                            <span className="block text-[11px] text-zinc-400">
                              Tối đa {fmtCurrency(voucher.maxDiscount)}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                        Đang áp dụng
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-4 text-xs sm:text-sm text-zinc-300">
                      {voucher.description || 'Áp dụng khi đặt vé xem phim trực tuyến tại Fivecore Cinema.'}
                    </p>

                    <div className="mt-3 text-[11px] text-zinc-500 space-y-1">
                      <div>
                        Đơn tối thiểu: <span className="text-zinc-300 font-medium">{fmtCurrency(voucher.minOrderValue)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-zinc-500" />
                        <span>Hạn dùng: {new Date(voucher.endDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Code box & Action */}
                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-800/80 pt-4">
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 px-3.5 py-2">
                      <span className="font-mono text-sm font-bold tracking-wider text-brand-400">
                        {voucher.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(voucher.code)}
                        className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                          copiedCode === voucher.code
                            ? 'bg-emerald-500 text-white'
                            : 'border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                        }`}
                      >
                        {copiedCode === voucher.code ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>

                      <Link
                        to="/"
                        className="flex items-center gap-1 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/25 transition hover:bg-brand-600"
                      >
                        <span>Dùng ngay</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nội dung Tab: Tin tức */}
        {activeTab === 'news' && (
          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {NEWS_ARTICLES.map((article) => (
                <div
                  key={article.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition hover:border-zinc-700 hover:shadow-2xl"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-950">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 rounded-md bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                      {article.category}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {article.date}
                        </span>
                        <span>•</span>
                        <span>{article.readTime}</span>
                      </div>
                      <h2 className="text-lg font-bold text-white transition group-hover:text-brand-400">
                        {article.title}
                      </h2>
                      <p className="mt-2 text-xs sm:text-sm text-zinc-400 line-clamp-2">
                        {article.excerpt}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => setSelectedArticle(article)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
                      >
                        <span>Đọc tiếp</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal đọc bài viết chi tiết */}
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <span className="rounded bg-brand-500/20 px-2.5 py-0.5 text-xs font-bold text-brand-300">
                  {selectedArticle.category}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:text-white"
                >
                  Đóng
                </button>
              </div>

              <h2 className="mt-4 text-xl sm:text-2xl font-bold text-white">
                {selectedArticle.title}
              </h2>
              <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                <span>{selectedArticle.date}</span>
                <span>•</span>
                <span>{selectedArticle.readTime}</span>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl aspect-[16/9] bg-zinc-950">
                <img
                  src={selectedArticle.imageUrl}
                  alt={selectedArticle.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="mt-6 text-sm leading-relaxed text-zinc-300 space-y-4">
                <p className="font-semibold text-zinc-100">{selectedArticle.excerpt}</p>
                <p>{selectedArticle.content}</p>
              </div>

              <div className="mt-8 border-t border-zinc-800 pt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="rounded-xl bg-brand-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-brand-600"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
