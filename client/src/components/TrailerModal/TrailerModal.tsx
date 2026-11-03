import { X } from 'lucide-react'

interface TrailerModalProps {
  isOpen: boolean
  onClose: () => void
  trailerUrl?: string
  movieTitle: string
}

function getEmbedUrl(url?: string): string {
  if (!url) return ''
  // Convert standard youtube url to embed url
  const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  const match = url.match(youtubeRegex)
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0`
  }
  return url
}

export default function TrailerModal({
  isOpen,
  onClose,
  trailerUrl,
  movieTitle,
}: TrailerModalProps) {
  if (!isOpen) return null

  const embedUrl = getEmbedUrl(trailerUrl)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3.5">
          <h3 className="font-semibold text-white text-sm sm:text-base truncate pr-4">
            Trailer: {movieTitle}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-video w-full bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={`Trailer - ${movieTitle}`}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
              Trailer hiện chưa khả dụng
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
