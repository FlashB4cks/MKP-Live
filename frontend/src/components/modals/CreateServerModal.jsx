import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useServerStore } from '../../store/serverStore';

export default function CreateServerModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createServer = useServerStore((state) => state.createServer);

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
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const res = await createServer(name.trim(), description.trim());
    setLoading(false);

    if (res.success) {
      setName('');
      setDescription('');
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
          Personaliza tu servidor
        </h2>
        <p className="text-sm text-center text-discord-text-muted mb-6">
          Dale una personalidad a tu nuevo servidor eligiendo un nombre y descripción.
        </p>

        {error && (
          <div className="mb-4 rounded bg-discord-red/20 p-3 text-sm text-discord-red border border-discord-red/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Nombre del servidor *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Servidor de Amigos"
              required
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="De qué trata este servidor"
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            />
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-white hover:underline px-4 py-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="rounded bg-discord-blurple px-6 py-2.5 text-sm font-medium text-white hover:bg-discord-blurple-hover transition disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
