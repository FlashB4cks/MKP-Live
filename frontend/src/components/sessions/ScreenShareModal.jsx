import React, { useState } from 'react';
import { Monitor, Volume2, VolumeX, X, AlertCircle, Sparkles } from 'lucide-react';

export default function ScreenShareModal({ isOpen, onClose, onStart }) {
  const [includeAudio, setIncludeAudio] = useState(true);

  if (!isOpen) return null;

  const handleStart = () => {
    onStart(includeAudio);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-discord-sidebar rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30 shadow-inner">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Transmitir Pantalla</span>
                <Sparkles className="w-3.5 h-3.5 text-discord-yellow" />
              </h3>
              <p className="text-xs text-discord-text-muted">
                Comparte tu pantalla, ventana o pestaña en vivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-discord-text-muted hover:text-white hover:bg-discord-hover transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-discord-text leading-relaxed">
            Puedes transmitir cualquier aplicación, presentación, video o juego con calidad fluida.
          </p>

          {/* Audio toggle option card */}
          <div
            onClick={() => setIncludeAudio(!includeAudio)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
              includeAudio
                ? 'bg-discord-blurple/15 border-discord-blurple/50 shadow-inner'
                : 'bg-discord-chat/60 border-white/5 hover:border-white/20'
            }`}
          >
            <input
              type="checkbox"
              id="includeAudioCheckbox"
              checked={includeAudio}
              onChange={(e) => setIncludeAudio(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 w-4 h-4 rounded text-discord-blurple focus:ring-discord-blurple/40 bg-discord-chat border-white/20 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <label
                htmlFor="includeAudioCheckbox"
                className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                {includeAudio ? (
                  <Volume2 className="w-4 h-4 text-discord-green" />
                ) : (
                  <VolumeX className="w-4 h-4 text-discord-text-muted" />
                )}
                <span>Transmitir también el sonido de la pantalla</span>
              </label>
              <p className="text-[11px] text-discord-text-muted mt-1 leading-normal">
                Permite que los demás escuchen el audio de videos o aplicaciones. Cada integrante podrá regular o silenciar el volumen de la transmisión de forma individual.
              </p>
            </div>
          </div>

          {/* Helper hint for browser permission */}
          {includeAudio && (
            <div className="bg-discord-yellow/10 border border-discord-yellow/30 rounded-xl p-3 flex items-start space-x-2 text-[11px] text-discord-yellow">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Consejo:</strong> En la ventana de tu navegador para elegir la pantalla, asegúrate de marcar la casilla <em>"Compartir audio"</em> (habitual al seleccionar una pestaña o pantalla completa).
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-discord-chat/40 border-t border-white/5 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-discord-text-muted hover:text-white hover:bg-white/5 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-discord-blurple hover:bg-discord-blurple-hover transition shadow-lg flex items-center gap-1.5"
          >
            <Monitor className="w-4 h-4" />
            <span>Comenzar a transmitir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
