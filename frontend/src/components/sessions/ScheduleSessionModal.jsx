import React, { useState } from 'react';
import { X, Calendar, Clock, ShieldCheck } from 'lucide-react';
import { useSessionStore } from '../../store/sessionStore';

export default function ScheduleSessionModal({ isOpen, onClose, serverId }) {
  // Default to tomorrow 10:00 AM local time formatted as YYYY-MM-DDTHH:MM
  const getDefaultDateTime = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState(getDefaultDateTime());
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const scheduleSession = useSessionStore((state) => state.scheduleSession);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) return;

    setLoading(true);
    setError(null);

    const res = await scheduleSession({
      server: serverId,
      title: title.trim(),
      description: description.trim(),
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: parseInt(durationMinutes, 10),
      requires_approval: requiresApproval,
    });

    setLoading(false);

    if (res.success) {
      setTitle('');
      setDescription('');
      onClose();
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-lg rounded-lg bg-discord-chat p-6 shadow-2xl border border-black/30">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-discord-text-muted hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-discord-blurple mb-2">
          <Calendar className="w-6 h-6" />
          <h2 className="text-xl font-bold text-white">Programar Sesión Virtual</h2>
        </div>
        <p className="text-xs text-discord-text-muted mb-5">
          Crea una reunión segura con video, audio y control de admisiones por VPN.
        </p>

        {error && (
          <div className="mb-4 rounded bg-discord-red/20 p-3 text-sm text-discord-red border border-discord-red/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
              Título de la sesión *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Clase de Telecomunicaciones / Reunión de Equipo"
              required
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
              Descripción o temario (opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos de la sesión, temas a tratar..."
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                Fecha y Hora *
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-discord-blurple"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                Duración
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-discord-blurple"
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora (60 min)</option>
                <option value={90}>1 hora y media (90 min)</option>
                <option value={120}>2 horas (120 min)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-3 cursor-pointer select-none rounded bg-discord-sidebar/60 p-3 border border-white/5 hover:border-white/10 transition">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="w-4 h-4 rounded text-discord-blurple focus:ring-0 focus:outline-none"
              />
              <div className="text-left">
                <span className="text-sm font-semibold text-white block">
                  Activar Sala de Espera (Aceptar conexiones)
                </span>
                <span className="text-xs text-discord-text-muted">
                  El anfitrión deberá aprobar a cada participante antes de permitirle ingresar al video.
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-white hover:underline px-4 py-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="rounded bg-discord-blurple px-6 py-2.5 text-sm font-medium text-white hover:bg-discord-blurple-hover transition disabled:opacity-50"
            >
              {loading ? 'Programando...' : 'Programar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
