import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useServerStore } from '../../store/serverStore';

export default function JoinServerModal({ isOpen, onClose }) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const joinServer = useServerStore((state) => state.joinServer);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError(null);

    // Extract code if user pasted a full URL
    let code = inviteCode.trim();
    if (code.includes('/')) {
      code = code.split('/').pop();
    }

    const res = await joinServer(code);
    setLoading(false);

    if (res.success) {
      setInviteCode('');
      onClose();
    } else {
      setError(res.error);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={() => {
        if (!loading) onClose();
      }}
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

        <h2 className="text-2xl font-bold text-center text-white mb-2">
          Únete a un servidor
        </h2>
        <p className="text-sm text-center text-discord-text-muted mb-6">
          Introduce un código o enlace de invitación para unirte a un servidor existente.
        </p>

        {error && (
          <div className="mb-4 rounded bg-discord-red/20 p-3 text-sm text-discord-red border border-discord-red/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Código de invitación *
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Ej: aB3xZ9"
              required
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            />
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-white hover:underline px-4 py-2"
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="rounded bg-discord-blurple px-6 py-2.5 text-sm font-medium text-white hover:bg-discord-blurple-hover transition disabled:opacity-50"
            >
              {loading ? 'Uniéndose...' : 'Unirse al servidor'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
