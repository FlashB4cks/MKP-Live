import React, { useState } from 'react';
import { FileText, Download, Play, Pause, Volume2 } from 'lucide-react';

export function getMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const base = envUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  return path;
}

export default function MessageAttachment({
  attachment,
  attachmentType,
  attachmentName,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (!attachment) return null;
  const fullUrl = getMediaUrl(attachment);

  // 1. IMAGE ATTACHMENT
  if (attachmentType === 'image') {
    return (
      <div className="mt-2 max-w-sm rounded-xl overflow-hidden border border-white/10 bg-black/20 shadow-md">
        <img
          src={fullUrl}
          alt={attachmentName || 'Imagen adjunta'}
          onClick={() => setModalOpen(true)}
          className="max-h-72 w-auto object-cover rounded-xl cursor-pointer hover:opacity-95 transition"
          loading="lazy"
        />

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setModalOpen(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <img
                src={fullUrl}
                alt={attachmentName || 'Imagen'}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
              <div className="mt-2 flex justify-between items-center text-xs text-discord-text-muted">
                <span className="truncate">{attachmentName || 'Imagen'}</span>
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-1 text-discord-blurple hover:underline font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Abrir original
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. AUDIO NOTE ATTACHMENT
  if (attachmentType === 'audio') {
    return (
      <div className="mt-2 flex items-center space-x-3 bg-discord-sidebar/80 border border-white/10 px-3.5 py-2.5 rounded-2xl max-w-sm shadow-md">
        <audio
          ref={(ref) => setAudioEl(ref)}
          src={fullUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => {
            if (!audioEl) return;
            if (isPlaying) {
              audioEl.pause();
            } else {
              audioEl.play().catch(() => {});
            }
          }}
          className="w-9 h-9 rounded-full bg-discord-blurple hover:bg-discord-blurple-hover flex items-center justify-center text-white transition shadow flex-shrink-0"
          title={isPlaying ? 'Pausar nota de voz' : 'Reproducir nota de voz'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
            <Volume2 className="w-3.5 h-3.5 text-discord-green flex-shrink-0" />
            <span className="truncate">Nota de voz</span>
          </div>
          <span className="text-[11px] text-discord-text-muted block truncate">
            {attachmentName || 'Audio grabado'}
          </span>
        </div>
      </div>
    );
  }

  // 3. GENERIC FILE ATTACHMENT
  return (
    <div className="mt-2 flex items-center space-x-3 bg-discord-sidebar/70 border border-white/10 px-3.5 py-2.5 rounded-xl max-w-sm hover:bg-discord-sidebar transition shadow-sm">
      <div className="p-2 bg-discord-blurple/20 text-discord-blurple rounded-lg flex-shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-white block truncate">
          {attachmentName || 'Archivo adjunto'}
        </span>
        <a
          href={fullUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 text-[11px] text-discord-blurple hover:underline font-medium mt-0.5"
        >
          <Download className="w-3 h-3" />
          <span>Descargar</span>
        </a>
      </div>
    </div>
  );
}
