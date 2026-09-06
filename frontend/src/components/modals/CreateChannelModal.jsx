import React, { useState } from 'react';
import { X, Hash } from 'lucide-react';
import { useServerStore } from '../../store/serverStore';

export default function CreateChannelModal({ isOpen, onClose, serverId }) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createChannel = useServerStore((state) => state.createChannel);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-');
    const res = await createChannel(serverId, cleanName, topic.trim());
    setLoading(false);

    if (res.success) {
      setName('');
      setTopic('');
      onClose();
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-discord-chat p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-discord-text-muted hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-2">
          Crear canal de texto
        </h2>
        <p className="text-xs text-discord-text-muted mb-6">
          en CANALES DE TEXTO
        </p>

        {error && (
          <div className="mb-4 rounded bg-discord-red/20 p-3 text-sm text-discord-red border border-discord-red/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Nombre del canal *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-discord-text-muted">
                <Hash className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="nuevo-canal"
                required
                className="w-full rounded bg-discord-sidebar py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Tema del canal (opcional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="¿De qué se hablará en este canal?"
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
              {loading ? 'Creando...' : 'Crear canal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
