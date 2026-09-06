import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Crown,
  Minimize2,
  Maximize2,
  AlertCircle,
  Bell,
  ArrowLeft,
  CheckCheck,
  ChevronRight,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import api from '../../api/client';

export default function VirtualSessionRoom({ session, onLeave }) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const endSession = useSessionStore((state) => state.endSession);
  const approveParticipant = useSessionStore((state) => state.approveParticipant);
  const isMinimized = useSessionStore((state) => state.isMinimized);
  const setIsMinimized = useSessionStore((state) => state.setIsMinimized);

  // Media States
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [stream, setStream] = useState(null);

  // Remote participants and waiting room
  const [participants, setParticipants] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Sidebar controls (Chat & Participants)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('chat'); // 'chat' | 'participants'
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const localVideoRef = useRef(null);
  const minimizedVideoRef = useRef(null);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isHost = session.host?.id === user?.id || session.is_host;

  // 1. Initial Fetch of participants, pending requests & chat messages from DB
  const refreshSessionData = async () => {
    try {
      const res = await api.get(`/sessions/${session.id}/`);
      const data = res.data;
      if (data.participants) {
        const accepted = data.participants
          .filter((p) => p.status === 'ACCEPTED' && p.user.id !== user?.id)
          .map((p) => ({
            user_id: p.user.id,
            username: p.user.username,
            is_audio_muted: p.is_audio_muted,
            is_video_off: p.is_video_off,
          }));
        setParticipants(accepted);

        if (isHost) {
          const pending = data.participants
            .filter((p) => p.status === 'PENDING')
            .map((p) => ({
              user_id: p.user.id,
              username: p.user.username,
            }));
          setPendingRequests(pending);
        }
      }

      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.warn('Could not fetch session data', err);
    }
  };

  useEffect(() => {
    refreshSessionData();
  }, [session.id, user?.id, isHost]);

  // Periodic polling for Host every 3 seconds to ensure real-time consistency
  useEffect(() => {
    if (!isHost || !session?.id) return;
    const interval = setInterval(refreshSessionData, 3000);
    return () => clearInterval(interval);
  }, [session.id, isHost]);

  // Auto-scroll to bottom of chat when new messages arrive and chat is visible
  useEffect(() => {
    if (sidebarOpen && sidebarTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sidebarOpen, sidebarTab]);

  // 2. Initialize Camera & Microphone Stream
  useEffect(() => {
    let localStream = null;

    async function initMedia() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(localStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        if (minimizedVideoRef.current) {
          minimizedVideoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.warn('Could not access camera/mic, falling back to virtual mode:', err);
        setMediaError('Cámara o micrófono no disponibles. Operando en modo virtual.');
      }
    }

    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Synchronize video element when switching between minimized and full screen
  useEffect(() => {
    if (stream) {
      if (!isMinimized && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      } else if (isMinimized && minimizedVideoRef.current) {
        minimizedVideoRef.current.srcObject = stream;
      }
    }
  }, [isMinimized, stream]);

  // 3. Connect to WebSocket Signaling Server
  useEffect(() => {
    if (!session?.id || !token) return;

    const rawHost = import.meta.env.VITE_WS_URL || window.location.host;
    const cleanHost = rawHost.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/+$/, '');
    const protocol = window.location.protocol === 'https:' || rawHost.startsWith('https:') || rawHost.startsWith('wss:') ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${cleanHost}/ws/sessions/${session.id}/?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'session_event') {
          if (data.event_type === 'chat_message') {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
            if (!sidebarOpen || sidebarTab !== 'chat') {
              setUnreadCount((c) => c + 1);
            }
          } else if (data.event_type === 'join_requested') {
            if (isHost) {
              setPendingRequests((prev) => {
                if (prev.some((p) => p.user_id === data.user_id)) return prev;
                return [...prev, { user_id: data.user_id, username: data.username }];
              });
              setSidebarOpen(true);
              setSidebarTab('participants');
            }
          } else if (data.event_type === 'participant_approved') {
            setPendingRequests((prev) => prev.filter((p) => p.user_id !== data.user_id));
            setParticipants((prev) => {
              if (prev.some((p) => p.user_id === data.user_id)) return prev;
              return [
                ...prev,
                {
                  user_id: data.user_id,
                  username: data.username || 'Participante',
                  is_audio_muted: false,
                  is_video_off: false,
                },
              ];
            });
          } else if (data.event_type === 'participant_rejected') {
            setPendingRequests((prev) => prev.filter((p) => p.user_id !== data.user_id));
          } else if (data.event_type === 'media_state_changed') {
            setParticipants((prev) =>
              prev.map((p) =>
                p.user_id === data.user_id
                  ? { ...p, is_audio_muted: data.is_audio_muted, is_video_off: data.is_video_off }
                  : p
              )
            );
          } else if (data.event_type === 'user_left') {
            setParticipants((prev) => prev.filter((p) => p.user_id !== data.user_id));
            setPendingRequests((prev) => prev.filter((p) => p.user_id !== data.user_id));
          }
        }
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [session.id, token, isHost, sidebarOpen, sidebarTab]);

  // Toggle Microphone
  const toggleAudio = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);

    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'media_state',
          is_audio_muted: nextMuted,
          is_video_off: isVideoOff,
        })
      );
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);

    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !nextVideoOff;
      });
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'media_state',
          is_audio_muted: isAudioMuted,
          is_video_off: nextVideoOff,
        })
      );
    }
  };

  // Send In-Meeting Chat Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const content = chatInput.trim();
    if (!content) return;
    setChatInput('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat_message',
          content,
        })
      );
    } else {
      try {
        const res = await api.post(`/sessions/${session.id}/messages/`, { content });
        setMessages((prev) => [...prev, res.data]);
      } catch (err) {
        console.error('Error sending session message', err);
      }
    }
  };

  // Host Action: Accept Participant
  const handleAcceptParticipant = async (targetUserId) => {
    await approveParticipant(session.id, targetUserId, 'ACCEPT');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'approve_participant',
          target_user_id: targetUserId,
          status: 'ACCEPTED',
        })
      );
    }
    setPendingRequests((prev) => prev.filter((p) => p.user_id !== targetUserId));
    refreshSessionData();
  };

  // Host Action: Reject Participant
  const handleRejectParticipant = async (targetUserId) => {
    await approveParticipant(session.id, targetUserId, 'REJECT');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'approve_participant',
          target_user_id: targetUserId,
          status: 'REJECTED',
        })
      );
    }
    setPendingRequests((prev) => prev.filter((p) => p.user_id !== targetUserId));
    refreshSessionData();
  };

  // Host Action: Accept All
  const handleAcceptAll = async () => {
    const list = [...pendingRequests];
    for (const p of list) {
      await handleAcceptParticipant(p.user_id);
    }
  };

  const handleEndOrLeave = async () => {
    setIsMinimized(false);
    if (isHost) {
      await endSession(session.id);
    }
    onLeave();
  };

  // Helper to open/toggle sidebar to a specific tab
  const toggleSidebarTab = (tabName) => {
    if (sidebarOpen && sidebarTab === tabName) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setSidebarTab(tabName);
      if (tabName === 'chat') {
        setUnreadCount(0);
      }
    }
  };

  // ==========================================
  // MODE 1: MINIMIZED FLOATING WINDOW (Picture-in-Picture)
  // Allows user to chat and browse while call is active
  // ==========================================
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-96 rounded-2xl bg-discord-chat shadow-2xl border-2 border-discord-blurple overflow-hidden flex flex-col select-none transition-all duration-300 ring-4 ring-black/40 animate-in fade-in slide-in-from-bottom-5">
        {/* Minimized Header */}
        <div className="bg-discord-sidebar px-3 py-2.5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-discord-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-discord-green"></span>
            </span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white truncate block max-w-[130px]">
                {session.title}
              </span>
              <span className="text-[10px] text-discord-green font-medium block">
                En llamada • Chat activo
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsMinimized(false)}
              className="flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold bg-discord-blurple text-white hover:bg-discord-blurple-hover transition shadow"
              title="Maximizar reunión a pantalla completa"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expandir</span>
            </button>

            <button
              onClick={handleEndOrLeave}
              className="p-1.5 rounded-md text-discord-red hover:bg-discord-red hover:text-white transition"
              title={isHost ? 'Finalizar sesión' : 'Salir de la reunión'}
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Host Quick Waiting Room Banner inside Minimized Card */}
        {isHost && pendingRequests.length > 0 && (
          <div className="bg-discord-blurple/20 border-b border-discord-blurple/30 px-3 py-1.5 flex items-center justify-between text-xs text-white">
            <div className="flex items-center space-x-1.5 min-w-0">
              <Bell className="w-3.5 h-3.5 text-discord-yellow animate-bounce flex-shrink-0" />
              <span className="truncate text-[11px] font-semibold">
                @{pendingRequests[0].username} en espera
                {pendingRequests.length > 1 && ` (+${pendingRequests.length - 1})`}
              </span>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={() => handleAcceptParticipant(pendingRequests[0].user_id)}
                className="px-2 py-0.5 rounded bg-discord-green hover:bg-discord-green/90 text-white text-[10px] font-bold"
                title="Aceptar conexión"
              >
                Aceptar
              </button>
              <button
                onClick={() => handleRejectParticipant(pendingRequests[0].user_id)}
                className="px-1.5 py-0.5 rounded bg-discord-red hover:bg-discord-red/90 text-white text-[10px] font-bold"
                title="Rechazar"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Minimized Video Preview */}
        <div className="relative h-44 bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={minimizedVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
          />

          {isVideoOff && (
            <div className="flex flex-col items-center justify-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-discord-blurple flex items-center justify-center text-lg font-bold text-white shadow-lg">
                {user?.username?.[0]?.toUpperCase() || 'Tú'}
              </div>
              <span className="text-[10px] text-discord-text-muted font-medium">
                Cámara desactivada
              </span>
            </div>
          )}

          {/* User badge */}
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-semibold text-white flex items-center space-x-1.5">
            <span>{user?.username} (Tú)</span>
            {isAudioMuted ? (
              <MicOff className="w-3 h-3 text-discord-red" />
            ) : (
              <Mic className="w-3 h-3 text-discord-green" />
            )}
          </div>

          {/* Connected Participants Count Badge */}
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-discord-text-muted flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{participants.length + 1} en llamada</span>
          </div>
        </div>

        {/* Minimized Quick Controls Bar */}
        <div className="bg-discord-sidebar px-3 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleAudio}
              className={`p-2 rounded-lg transition shadow-sm ${
                isAudioMuted
                  ? 'bg-discord-red text-white hover:bg-discord-red/90'
                  : 'bg-discord-channels text-white hover:bg-discord-hover'
              }`}
              title={isAudioMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
            >
              {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-2 rounded-lg transition shadow-sm ${
                isVideoOff
                  ? 'bg-discord-red text-white hover:bg-discord-red/90'
                  : 'bg-discord-channels text-white hover:bg-discord-hover'
              }`}
              title={isVideoOff ? 'Encender cámara' : 'Apagar cámara'}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => setIsMinimized(false)}
            className="text-xs font-semibold text-discord-blurple hover:text-white px-3 py-1.5 rounded-lg hover:bg-discord-blurple/20 transition flex items-center gap-1"
          >
            <span>Pantalla completa</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // MODE 2: FULLSCREEN VIDEO ROOM
  // ==========================================
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#111214] text-white select-none">
      {/* 1. Header Bar */}
      <header className="h-14 bg-discord-sidebar px-4 flex items-center justify-between border-b border-black/40 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* Prominent Back to Chat / Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center space-x-1.5 bg-discord-channels hover:bg-discord-hover text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition border border-white/10 shadow-sm"
            title="Regresar al chat de texto y minimizar la reunión en una ventana pequeña"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold">Volver al chat</span>
          </button>

          <div className="w-[1px] h-6 bg-white/10 hidden sm:block" />

          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-discord-blurple/20 text-discord-blurple">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white flex items-center gap-2 truncate">
                <span>{session.title}</span>
                {isHost && (
                  <span className="text-[10px] bg-discord-yellow/20 text-discord-yellow px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Anfitrión
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-discord-text-muted truncate">
                {session.description || 'Videoconferencia segura'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center space-x-2.5">
          {/* VPN Security Indicator Badge */}
          <div className="hidden md:flex items-center space-x-1.5 bg-discord-green/10 text-discord-green border border-discord-green/20 text-xs px-3 py-1 rounded-full font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>VPN Conectada</span>
          </div>

          {/* Chat Sidebar Toggle Button (Available to Host & All Members) */}
          <button
            onClick={() => toggleSidebarTab('chat')}
            className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow ${
              sidebarOpen && sidebarTab === 'chat'
                ? 'bg-discord-blurple text-white ring-2 ring-discord-blurple/50'
                : 'bg-discord-channels text-discord-text hover:text-white border border-white/10'
            }`}
            title="Abrir o cerrar chat de la reunión"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-discord-red text-white text-[10px] font-extrabold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* People / Waiting Room Toggle Button */}
          <button
            onClick={() => toggleSidebarTab('participants')}
            className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow ${
              sidebarOpen && sidebarTab === 'participants'
                ? 'bg-discord-blurple text-white ring-2 ring-discord-blurple/50'
                : isHost && pendingRequests.length > 0
                ? 'bg-discord-yellow/20 text-discord-yellow border border-discord-yellow/40 animate-pulse'
                : 'bg-discord-channels text-discord-text hover:text-white border border-white/10'
            }`}
            title={isHost ? 'Ver integrantes y sala de espera' : 'Ver integrantes conectados'}
          >
            <Users className="w-4 h-4" />
            <span>{isHost ? 'Sala de Espera' : 'Integrantes'}</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                isHost && pendingRequests.length > 0
                  ? 'bg-discord-yellow text-black font-extrabold'
                  : 'bg-black/40 text-discord-text-muted'
              }`}
            >
              {isHost ? pendingRequests.length : participants.length + 1}
            </span>
          </button>

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center space-x-1.5 text-xs font-semibold text-white bg-discord-channels hover:bg-discord-hover px-3 py-1.5 rounded-lg transition border border-white/10"
            title="Minimizar reunión a ventana pequeña"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Minimizar</span>
          </button>
        </div>
      </header>

      {/* 2. Host Alert Banner when participants are waiting */}
      {isHost && pendingRequests.length > 0 && (
        <div className="bg-discord-blurple/20 border-b border-discord-blurple/40 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-full bg-discord-blurple text-white">
              <Bell className="w-3.5 h-3.5 animate-bounce" />
            </span>
            <span className="text-xs font-semibold text-white">
              {pendingRequests.length === 1
                ? `Solicitud de acceso: @${pendingRequests[0].username} quiere unirse a la reunión.`
                : `Hay ${pendingRequests.length} integrantes esperando para unirse a la reunión.`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {pendingRequests.length === 1 ? (
              <>
                <button
                  onClick={() => handleAcceptParticipant(pendingRequests[0].user_id)}
                  className="flex items-center space-x-1 px-3 py-1 rounded bg-discord-green hover:bg-discord-green/90 text-white text-xs font-bold transition shadow"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Aceptar a @{pendingRequests[0].username}</span>
                </button>
                <button
                  onClick={() => handleRejectParticipant(pendingRequests[0].user_id)}
                  className="p-1 rounded bg-discord-red hover:bg-discord-red/90 text-white text-xs transition shadow"
                  title="Rechazar solicitud"
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={handleAcceptAll}
                className="flex items-center space-x-1.5 px-3.5 py-1 rounded bg-discord-green hover:bg-discord-green/90 text-white text-xs font-bold transition shadow"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Aceptar a todos ({pendingRequests.length})</span>
              </button>
            )}

            {(!sidebarOpen || sidebarTab !== 'participants') && (
              <button
                onClick={() => {
                  setSidebarOpen(true);
                  setSidebarTab('participants');
                }}
                className="text-xs text-discord-blurple hover:text-white underline font-semibold ml-2"
              >
                Ver panel
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Main Workspace: Video Grid + Toggleable Meeting Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center: Video Grid */}
        <main className="flex-1 p-4 overflow-y-auto flex flex-col justify-center items-center relative transition-all duration-300">
          {mediaError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-discord-yellow/20 border border-discord-yellow/40 text-discord-yellow text-xs px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{mediaError}</span>
            </div>
          )}

          <div className="w-full h-full max-h-[75vh] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto items-center">
            {/* Local User Video Card */}
            <div className="relative bg-discord-chat rounded-xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/5 h-64 sm:h-72 lg:h-80">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
              />

              {isVideoOff && (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-20 h-20 rounded-full bg-discord-blurple flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                    {user?.username?.[0]?.toUpperCase() || 'Tú'}
                  </div>
                  <span className="text-xs text-discord-text-muted">Cámara desactivada</span>
                </div>
              )}

              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-2">
                <span>{user?.username} (Tú)</span>
                {isAudioMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-discord-red" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-discord-green" />
                )}
              </div>
            </div>

            {/* Remote Participants Video Cards */}
            {participants.map((participant) => (
              <div
                key={participant.user_id}
                className="relative bg-discord-chat rounded-xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/5 h-64 sm:h-72 lg:h-80"
              >
                {participant.is_video_off ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-20 h-20 rounded-full bg-discord-channels flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                      {participant.username?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <span className="text-xs text-discord-text-muted">Cámara desactivada</span>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-discord-sidebar to-discord-channels flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-discord-blurple flex items-center justify-center text-2xl font-bold text-white">
                      {participant.username?.[0]?.toUpperCase()}
                    </div>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-2">
                  <span>{participant.username}</span>
                  {participant.is_audio_muted ? (
                    <MicOff className="w-3.5 h-3.5 text-discord-red" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-discord-green" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right Toggleable Sidebar: Chat & Participants Panel */}
        {sidebarOpen && (
          <aside className="w-80 sm:w-96 bg-discord-sidebar border-l border-black/40 flex flex-col h-full shadow-2xl flex-shrink-0 z-20 transition-all duration-300">
            {/* Sidebar Top Tabs Bar */}
            <div className="p-2 border-b border-white/10 flex items-center justify-between bg-discord-chat/40">
              <div className="flex items-center space-x-1">
                {/* Chat Tab Button */}
                <button
                  onClick={() => {
                    setSidebarTab('chat');
                    setUnreadCount(0);
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    sidebarTab === 'chat'
                      ? 'bg-discord-blurple text-white shadow-sm'
                      : 'text-discord-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                  {messages.length > 0 && (
                    <span className="text-[10px] opacity-75 font-normal">({messages.length})</span>
                  )}
                </button>

                {/* Participants / Waiting Room Tab Button */}
                <button
                  onClick={() => setSidebarTab('participants')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    sidebarTab === 'participants'
                      ? 'bg-discord-blurple text-white shadow-sm'
                      : 'text-discord-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {isHost && pendingRequests.length > 0
                      ? `Sala de Espera (${pendingRequests.length})`
                      : `Personas (${participants.length + 1})`}
                  </span>
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md text-discord-text-muted hover:text-white hover:bg-discord-hover transition"
                title="Cerrar panel lateral"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: IN-MEETING CHAT (Available to Host & Normal Members) */}
            {sidebarTab === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0 bg-discord-chat/20">
                <div className="px-3 py-2 bg-discord-sidebar/60 border-b border-white/5 text-[11px] text-discord-text-muted flex items-center justify-between">
                  <span>Mensajes de la reunión</span>
                  <span className="text-[10px] text-discord-green font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-discord-green inline-block"></span>
                    En tiempo real
                  </span>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-discord-text-muted space-y-2">
                      <div className="w-12 h-12 rounded-full bg-discord-channels/40 flex items-center justify-center text-discord-text-muted">
                        <MessageSquare className="w-6 h-6 opacity-40" />
                      </div>
                      <p className="text-xs font-semibold text-white">No hay mensajes aún</p>
                      <p className="text-[11px] text-discord-text-muted/70 leading-relaxed">
                        Los mensajes enviados aquí son visibles para todos los integrantes de la reunión.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.user?.id === user?.id;
                      const isMsgHost = msg.user?.id === session.host?.id;
                      const timeStr = msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';

                      return (
                        <div
                          key={msg.id || index}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center space-x-1.5 mb-1 px-1">
                            <span className="text-[11px] font-bold text-white flex items-center gap-1">
                              {msg.user?.username}
                              {isMsgHost && (
                                <Crown className="w-3 h-3 text-discord-yellow inline" title="Anfitrión" />
                              )}
                              {isMe && <span className="text-[9px] text-discord-text-muted font-normal">(Tú)</span>}
                            </span>
                            <span className="text-[9px] text-discord-text-muted">{timeStr}</span>
                          </div>

                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs break-words shadow-sm ${
                              isMe
                                ? 'bg-discord-blurple text-white rounded-br-none'
                                : 'bg-discord-sidebar text-discord-text rounded-bl-none border border-white/5'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-discord-sidebar border-t border-white/10 flex items-center space-x-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Enviar un mensaje a todos..."
                    className="flex-1 bg-discord-chat text-white placeholder-discord-text-muted text-xs px-3.5 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-discord-blurple transition shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2.5 rounded-lg bg-discord-blurple hover:bg-discord-blurple-hover disabled:opacity-40 text-white transition shadow-sm"
                    title="Enviar mensaje"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: PARTICIPANTS & WAITING ROOM */}
            {sidebarTab === 'participants' && (
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {/* Host: Waiting Room Section */}
                {isHost && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-discord-yellow flex items-center gap-1.5">
                        <span>En Sala de Espera</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-discord-yellow/20 text-discord-yellow text-[11px]">
                          {pendingRequests.length}
                        </span>
                      </span>

                      {pendingRequests.length > 1 && (
                        <button
                          onClick={handleAcceptAll}
                          className="text-[11px] text-discord-green hover:underline font-bold"
                        >
                          Aceptar a todos
                        </button>
                      )}
                    </div>

                    {pendingRequests.length === 0 ? (
                      <div className="bg-discord-chat/60 rounded-xl p-4 text-center border border-white/5 space-y-1.5">
                        <Users className="w-8 h-8 text-discord-text-muted/40 mx-auto" />
                        <p className="text-xs font-semibold text-white">
                          No hay integrantes en espera
                        </p>
                        <p className="text-[11px] text-discord-text-muted leading-relaxed">
                          Cuando un participante solicite ingresar a la reunión protegida por VPN,
                          aparecerá aquí para que lo aceptes.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingRequests.map((req) => (
                          <div
                            key={req.user_id}
                            className="bg-discord-chat p-3 rounded-xl border border-discord-yellow/30 flex items-center justify-between shadow-sm"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-discord-blurple text-xs font-bold flex items-center justify-center text-white flex-shrink-0">
                                {req.username[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-white truncate block">
                                  @{req.username}
                                </span>
                                <span className="text-[10px] text-discord-text-muted">
                                  Esperando aprobación...
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleAcceptParticipant(req.user_id)}
                                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-discord-green hover:bg-discord-green/90 text-white text-xs font-bold transition shadow"
                                title="Aceptar conexión"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Aceptar</span>
                              </button>
                              <button
                                onClick={() => handleRejectParticipant(req.user_id)}
                                className="p-1.5 rounded-md bg-discord-red hover:bg-discord-red/90 text-white transition shadow"
                                title="Rechazar conexión"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Connected Participants Section */}
                <div className={isHost ? 'pt-3 border-t border-white/10' : ''}>
                  <span className="text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2 block">
                    Conectados en la llamada ({participants.length + 1})
                  </span>

                  <div className="space-y-1.5">
                    {/* Host User */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-discord-chat/40 text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-discord-blurple text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0">
                          {session.host?.username?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-white truncate">
                          @{session.host?.username} {isHost && '(Tú)'}
                        </span>
                      </div>
                      <span className="text-[10px] text-discord-yellow font-bold bg-discord-yellow/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Anfitrión
                      </span>
                    </div>

                    {/* Remote Accepted Participants */}
                    {participants.map((p) => (
                      <div
                        key={p.user_id}
                        className="flex items-center justify-between p-2 rounded-lg bg-discord-chat/40 text-xs"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-discord-channels text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0">
                            {p.username?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-discord-text font-medium truncate">
                            @{p.username} {!isHost && p.user_id === user?.id && '(Tú)'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-discord-text-muted">
                          {p.is_audio_muted ? (
                            <MicOff className="w-3 h-3 text-discord-red" />
                          ) : (
                            <Mic className="w-3 h-3 text-discord-green" />
                          )}
                          {p.is_video_off ? (
                            <VideoOff className="w-3 h-3 text-discord-red" />
                          ) : (
                            <Video className="w-3 h-3 text-discord-green" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 4. Bottom Controls Bar */}
      <footer className="h-20 bg-discord-sidebar px-6 flex items-center justify-center space-x-3 sm:space-x-4 border-t border-black/40 flex-shrink-0">
        {/* Toggle Microphone */}
        <button
          onClick={toggleAudio}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition shadow-lg ${
            isAudioMuted
              ? 'bg-discord-red text-white hover:bg-discord-red/90'
              : 'bg-discord-channels text-white hover:bg-discord-hover'
          }`}
          title={isAudioMuted ? 'Activar micrófono' : 'Desactivar micrófono'}
        >
          {isAudioMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          <span className="text-[9px] mt-1 font-medium">{isAudioMuted ? 'Silenciado' : 'Mic'}</span>
        </button>

        {/* Toggle Camera */}
        <button
          onClick={toggleVideo}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition shadow-lg ${
            isVideoOff
              ? 'bg-discord-red text-white hover:bg-discord-red/90'
              : 'bg-discord-channels text-white hover:bg-discord-hover'
          }`}
          title={isVideoOff ? 'Activar cámara' : 'Desactivar cámara'}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          <span className="text-[9px] mt-1 font-medium">{isVideoOff ? 'Cámara off' : 'Cámara'}</span>
        </button>

        {/* Toggle In-Meeting Chat Sidebar (Available to Host & All Members) */}
        <button
          onClick={() => toggleSidebarTab('chat')}
          className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition shadow-lg ${
            sidebarOpen && sidebarTab === 'chat'
              ? 'bg-discord-blurple text-white ring-2 ring-discord-blurple/50'
              : 'bg-discord-channels text-white hover:bg-discord-hover'
          }`}
          title="Abrir chat de la reunión"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-[9px] mt-1 font-medium">Chat</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-discord-red text-white text-[10px] font-bold animate-bounce shadow">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Toggle Participants / Waiting Room Sidebar */}
        <button
          onClick={() => toggleSidebarTab('participants')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition shadow-lg ${
            sidebarOpen && sidebarTab === 'participants'
              ? 'bg-discord-blurple text-white ring-2 ring-discord-blurple/50'
              : 'bg-discord-channels text-white hover:bg-discord-hover'
          }`}
          title={isHost ? 'Ver integrantes y sala de espera' : 'Ver integrantes'}
        >
          <Users className="w-6 h-6" />
          <span className="text-[9px] mt-1 font-medium">Personas</span>
        </button>

        {/* Return to Chat / Minimize to Floating PiP */}
        <button
          onClick={() => setIsMinimized(true)}
          className="flex flex-col items-center justify-center px-4 h-14 rounded-2xl bg-discord-channels hover:bg-discord-hover text-white transition shadow-lg border border-white/10"
          title="Minimizar reunión a ventana pequeña para volver al chat de texto"
        >
          <Minimize2 className="w-5 h-5 text-discord-blurple" />
          <span className="text-[9px] mt-1 font-semibold text-white">Minimizar</span>
        </button>

        {/* Leave or End Session */}
        <button
          onClick={handleEndOrLeave}
          className="flex flex-col items-center justify-center px-5 h-14 rounded-2xl bg-discord-red text-white hover:bg-discord-red/90 transition shadow-lg ml-1"
          title={isHost ? 'Finalizar sesión para todos' : 'Salir de la reunión'}
        >
          <PhoneOff className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-bold">
            {isHost ? 'Finalizar' : 'Salir'}
          </span>
        </button>
      </footer>
    </div>
  );
}
