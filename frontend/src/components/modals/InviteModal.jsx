import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check } from 'lucide-react';
import { useServerStore } from '../../store/serverStore';

export default function InviteModal({ isOpen, onClose, server }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const createInvite = useServerStore((state) => state.createInvite);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && server) {
      setLoading(true);
      setCopied(false);
      createInvite(server.id, 0).then((res) => {
        setLoading(false);
        if (res.success) {
          setInvite(res.invite);
        }
      });
    }
  }, [isOpen, server, createInvite]);

  if (!isOpen || !server) return null;

  const handleCopy = () => {
    if (!invite) return;
    navigator.clipboard.writeText(invite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg bg-discord-chat p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-discord-text-muted hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-white mb-2">
          Invita amigos a {server.name}
        </h2>
        <p className="text-xs text-discord-text-muted mb-4">
          Comparte este código con tus amigos para que puedan unirse directamente a este servidor.
        </p>

        {loading ? (
          <div className="py-6 text-center text-sm text-discord-text-muted">
            Generando código de invitación...
          </div>
        ) : invite ? (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Código de invitación
            </label>
            <div className="flex items-center gap-2 rounded bg-discord-sidebar p-2 border border-black/30">
              <input
                type="text"
                readOnly
                value={invite.code}
                className="w-full bg-transparent font-mono text-sm text-white focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-white transition ${
                  copied
                    ? 'bg-discord-green hover:bg-discord-green/90'
                    : 'bg-discord-blurple hover:bg-discord-blurple-hover'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-discord-text-muted">
              Tu enlace de invitación no caduca nunca.
            </p>
          </div>
        ) : (
          <div className="py-4 text-sm text-discord-red">
            No se pudo generar la invitación. Verifica tus permisos.
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
