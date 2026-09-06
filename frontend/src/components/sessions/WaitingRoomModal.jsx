import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Clock, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import api from '../../api/client';

export default function WaitingRoomModal({ isOpen, onLeave, session, onApproved }) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);

  const [rejected, setRejected] = useState(false);
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !session?.id || !token) return;

    // 1. Establish WebSocket to emit request_join and listen for approval
    const rawHost = import.meta.env.VITE_WS_URL || window.location.host;
    const cleanHost = rawHost.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/+$/, '');
    const protocol = window.location.protocol === 'https:' || rawHost.startsWith('https:') || rawHost.startsWith('wss:') ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${cleanHost}/ws/sessions/${session.id}/?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send join request to notify host
      ws.send(JSON.stringify({ type: 'request_join' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'session_event') {
          if (
            data.event_type === 'participant_approved' &&
            (!data.user_id || data.user_id === user?.id)
          ) {
            handleEnterSession();
          } else if (
            data.event_type === 'participant_rejected' &&
            data.user_id === user?.id
          ) {
            setRejected(true);
          }
        }
      } catch (err) {
        console.error('WS parse error in waiting room', err);
      }
    };

    // 2. Fallback polling every 2.5 seconds to verify approval status
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.post(`/sessions/${session.id}/join/`);
        if (res.data.participant_status === 'ACCEPTED') {
          handleEnterSession();
        } else if (res.data.participant_status === 'REJECTED') {
          setRejected(true);
        }
      } catch (err) {
        console.warn('Polling check error in waiting room', err);
      }
    }, 2500);

    function handleEnterSession() {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
      if (onApproved) {
        onApproved(session);
      } else {
        setActiveSession(session);
      }
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [isOpen, session?.id, token, user?.id, onApproved, setActiveSession]);

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-discord-chat p-8 text-center shadow-2xl border border-white/10">
        {rejected ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-discord-red/20 text-discord-red mx-auto flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Solicitud Rechazada</h2>
            <p className="text-sm text-discord-text-muted">
              El anfitrión ha rechazado tu solicitud de acceso a "{session.title}".
            </p>
            <button
              onClick={onLeave}
              className="w-full rounded-lg bg-discord-sidebar hover:bg-discord-hover py-2.5 text-sm font-medium text-white transition border border-white/10"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div>
            {/* Animated Pulse Ring */}
            <div className="mx-auto mb-6 relative flex items-center justify-center w-20 h-20">
              <div className="absolute w-20 h-20 rounded-full bg-discord-blurple/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-discord-blurple/30 flex items-center justify-center text-discord-blurple shadow-inner">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Sala de Espera de MKP Live
            </h2>
            <p className="text-sm text-discord-text-muted mb-6 leading-relaxed">
              Has solicitado unirte a <strong className="text-white">"{session.title}"</strong>.
              <br />
              El anfitrión <span className="text-discord-blurple font-semibold">@{session.host?.username}</span> debe aceptar tu conexión antes de que puedas ingresar.
            </p>

            {/* VPN Security Badge */}
            <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-discord-green bg-discord-green/10 border border-discord-green/20 rounded-full py-1.5 px-4 mx-auto w-fit mb-6">
              <ShieldCheck className="w-4 h-4" />
              <span>Conexión Protegida mediante VPN</span>
            </div>

            <div className="flex items-center justify-center space-x-2 text-xs text-discord-text-muted mb-6">
              <Loader2 className="w-4 h-4 animate-spin text-discord-blurple" />
              <span>Esperando aprobación del anfitrión...</span>
            </div>

            <button
              onClick={onLeave}
              className="w-full rounded-lg bg-discord-sidebar hover:bg-discord-hover py-2.5 text-sm font-medium text-white transition border border-white/10"
            >
              Cancelar y salir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
