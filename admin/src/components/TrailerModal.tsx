
import { Modal, Empty } from 'antd';

interface TrailerModalProps {
  open: boolean;
  title: string;
  trailerUrl?: string | null;
  onClose: () => void;
}

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');
    let videoId = '';

    if (hostname === 'youtu.be') {
      videoId = parsedUrl.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtube-nocookie.com'
    ) {
      if (parsedUrl.pathname === '/watch') {
        videoId = parsedUrl.searchParams.get('v') ?? '';
      } else {
        const match = parsedUrl.pathname.match(
          /^\/(?:embed|shorts|live)\/([^/?]+)/,
        );
        videoId = match?.[1] ?? '';
      }
    } else {
      return null;
    }

    if (!/^[\w-]{11}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
};

const TrailerModal = ({
  open,
  title,
  trailerUrl,
  onClose,
}: TrailerModalProps) => {
  const embedUrl = trailerUrl
    ? getYouTubeEmbedUrl(trailerUrl.trim())
    : null;

  return (
    <Modal
      title={`Trailer - ${title}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      centered
      destroyOnHidden
    >
      {embedUrl ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            background: '#000',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={`Trailer phim ${title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 0,
            }}
          />
        </div>
      ) : (
        <Empty
          description={
            trailerUrl
              ? 'Link trailer không hợp lệ. Vui lòng kiểm tra lại link YouTube.'
              : 'Phim này chưa có trailer.'
          }
        />
      )}
    </Modal>
  );
};

export default TrailerModal;
