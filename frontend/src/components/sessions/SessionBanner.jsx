import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, Plus, ShieldCheck, Play, Zap, Trash2, Users, Bell } from 'lucide-react';
import { useSessionStore } from '../../store/sessionStore';
import { useAuthStore } from '../../store/authStore';
import ScheduleSessionModal from './ScheduleSessionModal';
import WaitingRoomModal from './WaitingRoomModal';

export default function SessionBanner({ serverId }) {
  const user = useAuthStore((state) => state.user);
  const sessions = useSessionStore((state) => state.sessions);
  const fetchSessions = useSessionStore((state) => state.fetchSessions);
  const startSession = useSessionStore((state) => state.startSession);
  const startInstantSession = useSessionStore((state) => state.startInstantSession);
  const deleteSession = useSessionStore((state) => state.deleteSession);
  const requestJoinSession = useSessionStore((state) => state.requestJoinSession);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const setIsMinimized = useSessionStore((state) => state.setIsMinimized);

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [waitingSession, setWaitingSession] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (serverId) {
      fetchSessions(serverId);
      const interval = setInterval(() => {
        fetchSessions(serverId);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [serverId, fetchSessions]);

  // Instant 1-Click Meeting
  const handleInstantMeeting = async () => {
    setLoadingAction(true);
    const res = await startInstantSession(serverId);
    setLoadingAction(false);
    if (res.success) {
      setActiveSession(res.session);
      setIsMinimized(false);
    }
  };

  // Start Scheduled or Join Live
  const handleStartOrJoin = async (session) => {
    setLoadingAction(true);
    const isHost = session.host?.id === user?.id || session.is_host;

    if (isHost && session.status !== 'ACTIVE') {
      const res = await startSession(session.id);
      setLoadingAction(false);
      if (res.success) {
        setActiveSession(res.session);
        setIsMinimized(false);
      }
    } else {
      const res = await requestJoinSession(session.id);
      setLoadingAction(false);
      if (res.success) {
        if (res.participant_status === 'ACCEPTED' || isHost) {
          setActiveSession(res.session);
          setIsMinimized(false);
        } else if (res.participant_status === 'PENDING') {
          setWaitingSession(res.session);
        }
      }
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas cancelar esta sesión programada?')) {
      await deleteSession(sessionId);
    }
  };

  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');
  const scheduledSessions = sessions.filter((s) => s.status === 'SCHEDULED');

  if (!serverId) return null;

  return (
    <div className="bg-discord-sidebar/90 border-b border-black/30 px-4 py-3 flex-shrink-0">
      {/* Header Bar with Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-discord-blurple/20 text-discord-blurple shadow-inner">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Sesiones Virtuales Seguras (VPN)
            </span>
            <span className="text-[10px] text-discord-text-muted">
              Videoconferencias con cámara, micrófono y sala de espera
            </span>
          </div>
        </div>

        {/* Action Buttons: Instant Meeting & Schedule */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleInstantMeeting}
            disabled={loadingAction}
            className="flex items-center space-x-1.5 text-xs font-bold text-white bg-discord-green hover:bg-discord-green/90 px-3 py-1.5 rounded-md transition shadow disabled:opacity-50"
            title="Iniciar inmediatamente una reunión en vivo"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Iniciar ahora</span>
          </button>

          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center space-x-1 text-xs font-semibold text-discord-blurple hover:text-white bg-discord-blurple/15 hover:bg-discord-blurple px-3 py-1.5 rounded-md transition"
            title="Programar para una fecha futura"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Programar</span>
          </button>
        </div>
      </div>

      {/* List of Sessions */}
      {activeSessions.length > 0 || scheduledSessions.length > 0 ? (
        <div className="mt-3 space-y-2">
          {/* Active Live Sessions */}
          {activeSessions.map((session) => {
            const isHost = session.host?.id === user?.id || session.is_host;
            return (
              <div
                key={session.id}
                className="flex items-center justify-between bg-discord-chat p-2.5 rounded-lg border border-discord-green/40 shadow-sm"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="flex h-3 w-3 relative flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-discord-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-discord-green"></span>
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white truncate block">
                      {session.title}
                    </span>
                    <span className="text-[10px] text-discord-text-muted">
                      En vivo • Anfitrión: @{session.host?.username}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isHost && session.pending_count > 0 && (
                    <div className="flex items-center space-x-1 bg-discord-yellow/15 border border-discord-yellow/40 text-discord-yellow text-xs px-2.5 py-1 rounded-md font-bold animate-pulse">
                      <Users className="w-3.5 h-3.5" />
                      <span>{session.pending_count} en espera</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleStartOrJoin(session)}
                    disabled={loadingAction}
                    className="flex items-center space-x-1.5 rounded bg-discord-green hover:bg-discord-green/90 px-3.5 py-1.5 text-xs font-bold text-white transition shadow"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isHost ? (session.pending_count > 0 ? 'Entrar / Aceptar' : 'Entrar a la sesión') : 'Unirse a la sesión'}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Scheduled Sessions */}
          {scheduledSessions.map((session) => {
            const isHost = session.host?.id === user?.id || session.is_host;
            const formattedDate = new Date(session.scheduled_at).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={session.id}
                className="flex items-center justify-between bg-discord-chat/70 p-2.5 rounded-lg border border-white/10 hover:border-white/20 transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Calendar className="w-4 h-4 text-discord-blurple flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white truncate block">
                      {session.title}
                    </span>
                    <span className="text-[10px] text-discord-text-muted flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{formattedDate} ({session.duration_minutes} min)</span>
                      <span>•</span>
                      <span>Anfitrión: @{session.host?.username}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isHost ? (
                    <>
                      <button
                        onClick={() => handleStartOrJoin(session)}
                        disabled={loadingAction}
                        className="flex items-center space-x-1.5 rounded bg-discord-blurple hover:bg-discord-blurple-hover px-3 py-1.5 text-xs font-bold text-white transition shadow"
                        title="Iniciar esta sesión programada"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Iniciar ahora</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1.5 text-discord-text-muted hover:text-discord-red transition rounded"
                        title="Cancelar sesión programada"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleStartOrJoin(session)}
                      disabled={loadingAction}
                      className="flex items-center space-x-1.5 rounded bg-discord-blurple hover:bg-discord-blurple-hover px-3 py-1.5 text-xs font-bold text-white transition shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Unirse</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-discord-text-muted flex items-center justify-between bg-discord-chat/40 p-2 rounded-lg border border-white/5">
          <span>No hay sesiones activas en este servidor.</span>
          <span className="text-discord-text-muted/60">Haz clic en "Iniciar ahora" para comenzar una reunión.</span>
        </div>
      )}

      {/* Modals */}
      <ScheduleSessionModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        serverId={serverId}
      />

      {waitingSession && (
        <WaitingRoomModal
          isOpen={!!waitingSession}
          session={waitingSession}
          onLeave={() => setWaitingSession(null)}
          onApproved={(admittedSession) => {
            setWaitingSession(null);
            setActiveSession(admittedSession || waitingSession);
            setIsMinimized(false);
          }}
        />
      )}
    </div>
  );
}
