import { X, ExternalLink, Film } from "lucide-react";

/**
 * Converts a raw YouTube or Hudl URL to an embeddable iframe src.
 * Returns null for unsupported URLs (caller falls back to external link).
 */
export function getEmbedUrl(url) {
  if (!url) return null;

  // YouTube: youtube.com/watch?v=ID  or  youtu.be/ID
  const ytId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/#]+)/)?.[1]?.trim();
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;

  // Hudl: hudl.com/video/3/TEAM/ID  →  hudl.com/embed/video/3/TEAM/ID
  if (url.includes("hudl.com/video/")) {
    return url.replace("hudl.com/video/", "hudl.com/embed/video/");
  }
  if (url.includes("hudl.com/v/")) {
    return url.replace("hudl.com/v/", "hudl.com/embed/video/");
  }

  return null;
}

export function VideoModal({ url, playerName, onClose }) {
  const embedUrl = getEmbedUrl(url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      data-testid="video-modal-backdrop"
    >
      <div
        className="w-full max-w-3xl"
        onClick={e => e.stopPropagation()}
        data-testid="video-modal"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-blue-400" />
            <span className="text-white font-bold text-sm">
              {playerName ? `${playerName} — Highlight Reel` : "Highlight Reel"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-bold transition-colors"
              data-testid="video-modal-open-original"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open original
            </a>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              data-testid="video-modal-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video area */}
        <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              title="Highlight Reel"
              data-testid="video-modal-iframe"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Film className="w-12 h-12 text-slate-600" />
              <p className="text-slate-400 text-sm">Inline preview not available for this URL</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
                data-testid="video-modal-fallback-link"
              >
                <ExternalLink className="w-4 h-4" /> Watch on external site
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
