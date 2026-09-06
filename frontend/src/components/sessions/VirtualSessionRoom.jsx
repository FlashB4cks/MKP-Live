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
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import api from '../../api/client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

function RemoteParticipantCard({
  participant,
  stream,
  isHost,
  onHostMute,
  onHostDisableVideo,
  onHostKick,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!stream) return;

    const attachMedia = () => {
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      if (videoRef.current) {
        videoRef.current.play().catch((e) => console.warn('[WebRTC] Video autoplay caught:', e));
      }
      if (audioRef.current && audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
      }
      if (audioRef.current) {
        audioRef.current.play().catch((e) => console.warn('[WebRTC] Audio autoplay caught:', e));
      }
    };

    attachMedia();

    stream.addEventListener('addtrack', attachMedia);
    stream.addEventListener('removetrack', attachMedia);

    return () => {
      stream.removeEventListener('addtrack', attachMedia);
      stream.removeEventListener('removetrack', attachMedia);
    };
  }, [stream]);

  useEffect(() => {
    const handleUserInteraction = () => {
      if (audioRef.current && audioRef.current.paused && stream) {
        audioRef.current.play().catch(() => {});
      }
      if (videoRef.current && videoRef.current.paused && stream) {
        videoRef.current.play().catch(() => {});
      }
    };
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [stream]);

  const hasVideoTrack = Boolean(
    stream &&
      stream.getVideoTracks &&
      stream.getVideoTracks().length > 0 &&
      stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
  );

  const showVideo = !participant.is_video_off && stream && hasVideoTrack;

  return (
    <div className="relative bg-discord-chat rounded-xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/5 h-44 sm:h-64 lg:h-80 group">
      {/* Dedicated Remote Audio Playback Element: never interrupted by video toggles */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Remote Video Element: muted to prevent echo since audio is handled by dedicated audio tag */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${showVideo ? 'block' : 'hidden'}`}
      />

      {/* Host Quick Moderation Floating Controls */}
      {isHost && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center space-x-1.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-lg">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHostMute?.(participant.user_id);
            }}
            className={`p-1 rounded transition ${
              participant.is_audio_muted
                ? 'text-discord-red bg-discord-red/20'
                : 'text-discord-text-muted hover:text-white hover:bg-white/10'
            }`}
            title={participant.is_audio_muted ? 'Participante ya silenciado' : 'Silenciar micrófono'}
          >
            <MicOff className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHostDisableVideo?.(participant.user_id);
            }}
            className={`p-1 rounded transition ${
              participant.is_video_off
                ? 'text-discord-yellow bg-discord-yellow/20'
                : 'text-discord-text-muted hover:text-white hover:bg-white/10'
            }`}
            title={participant.is_video_off ? 'Cámara ya apagada' : 'Apagar cámara'}
          >
            <VideoOff className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHostKick?.(participant.user_id);
            }}
            className="p-1 rounded text-discord-red hover:text-white hover:bg-discord-red transition"
            title="Expulsar de la reunión"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!showVideo && (
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-discord-channels flex items-center justify-center text-3xl font-bold text-white shadow-xl">
            {participant.username?.[0]?.toUpperCase() || 'P'}
          </div>
          <span className="text-xs text-discord-text-muted">
            {participant.is_video_off
              ? 'Cámara desactivada'
              : !stream
              ? 'Conectando video...'
              : 'Esperando video...'}
          </span>
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
  );
}

export default function VirtualSessionRoom({ session, onLeave }) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const endSession = useSessionStore((state) => state.endSession);
  const approveParticipant = useSessionStore((state) => state.approveParticipant);
  const moderateParticipant = useSessionStore((state) => state.moderateParticipant);
  const isMinimized = useSessionStore((state) => state.isMinimized);
  const setIsMinimized = useSessionStore((state) => state.setIsMinimized);

  // Media States
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [mediaError, setMediaError] = useState(null);
  const [moderationNotice, setModerationNotice] = useState(null);
  const [stream, setStream] = useState(null);

  // Remote participants and waiting room
  const [participants, setParticipants] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});

  // WebRTC Mesh refs
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef({});

  // Sidebar controls (Chat & Participants)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('chat'); // 'chat' | 'participants'
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const sidebarOpenRef = useRef(sidebarOpen);
  const sidebarTabRef = useRef(sidebarTab);
  useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
    sidebarTabRef.current = sidebarTab;
  }, [sidebarOpen, sidebarTab]);

  const localVideoRef = useRef(null);
  const minimizedVideoRef = useRef(null);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isHost = session.host?.id === user?.id || session.is_host;

  // Helper to determine deterministic initiator
  const shouldInitiateWith = (otherUserId) => {
    if (!user?.id || !otherUserId) return false;
    return String(user.id) > String(otherUserId);
  };

  const optimizeVideoSender = (pc) => {
    try {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender && sender.getParameters) {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = 1500000; // 1.5 Mbps for crisp HD
        sender.setParameters(params).catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  };

  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => track.stop());
      }

      let newStream = null;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: nextMode },
            width: { ideal: 1280, min: 640, max: 1920 },
            height: { ideal: 720, min: 480, max: 1080 },
            frameRate: { ideal: 30, min: 15, max: 60 },
          },
          audio: false,
        });
      } catch (hdErr) {
        console.warn('[WebRTC] HD camera flip fallback:', hdErr);
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
          audio: false,
        });
      }

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
        }
        localStreamRef.current.addTrack(newVideoTrack);
      }

      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack).catch((e) => console.warn('replaceTrack error:', e));
        } else if (localStreamRef.current) {
          pc.addTrack(newVideoTrack, localStreamRef.current);
        }
        optimizeVideoSender(pc);
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      if (minimizedVideoRef.current) {
        minimizedVideoRef.current.srcObject = localStreamRef.current;
      }

      setStream(new MediaStream(localStreamRef.current.getTracks()));
      setFacingMode(nextMode);
      setIsVideoOff(false);
    } catch (err) {
      console.error('[WebRTC] Error flipping camera:', err);
    }
  };

  // Host Moderation Actions
  const handleHostMute = async (targetUserId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'host_mute_participant',
          target_user_id: String(targetUserId),
        })
      );
    }
    moderateParticipant(session.id, targetUserId, 'MUTE');
  };

  const handleHostDisableVideo = async (targetUserId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'host_disable_video_participant',
          target_user_id: String(targetUserId),
        })
      );
    }
    moderateParticipant(session.id, targetUserId, 'DISABLE_VIDEO');
  };

  const handleHostKick = async (targetUserId) => {
    if (window.confirm('¿Estás seguro de que deseas expulsar a este participante de la reunión?')) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'host_kick_participant',
            target_user_id: String(targetUserId),
          })
        );
      }
      moderateParticipant(session.id, targetUserId, 'KICK');
      closePeerConnection(targetUserId);
      setParticipants((prev) => prev.filter((p) => String(p.user_id) !== String(targetUserId)));
    }
  };

  const sendSignal = (targetUserId, signalData) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'signal',
          target_user_id: String(targetUserId),
          signal_data: signalData,
        })
      );
    } else {
      console.warn(`[WebRTC] Cannot send signal to ${targetUserId}: WS not open`);
    }
  };

  const closePeerConnection = (targetUserId) => {
    const peerKey = String(targetUserId);
    if (peerConnectionsRef.current[peerKey]) {
      try {
        peerConnectionsRef.current[peerKey].close();
      } catch (e) {
        // ignore
      }
      delete peerConnectionsRef.current[peerKey];
    }
    delete pendingCandidatesRef.current[peerKey];
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[peerKey];
      delete next[targetUserId];
      return next;
    });
  };

  const getOrCreatePeerConnection = (targetUserId) => {
    const peerKey = String(targetUserId);
    let pc = peerConnectionsRef.current[peerKey];

    if (!pc) {
      console.log(`[WebRTC] Creating RTCPeerConnection for peer ${peerKey}`);
      pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[peerKey] = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(peerKey, {
            type: 'candidate',
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        console.log(`[WebRTC] Remote track received from ${peerKey}:`, event.track.kind);
        setRemoteStreams((prev) => {
          let currentStream = prev[peerKey] || prev[targetUserId];
          if (!currentStream) {
            if (event.streams && event.streams[0]) {
              currentStream = event.streams[0];
            } else {
              currentStream = new MediaStream([event.track]);
            }
          } else {
            if (!currentStream.getTracks().some((t) => t.id === event.track.id)) {
              currentStream.addTrack(event.track);
            }
            currentStream = new MediaStream(currentStream.getTracks());
          }

          return {
            ...prev,
            [peerKey]: currentStream,
            [targetUserId]: currentStream,
          };
        });
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE state with ${peerKey}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          console.warn(`[WebRTC] ICE failed with ${peerKey}, attempting restart`);
          if (pc.restartIce) {
            pc.restartIce();
          } else if (shouldInitiateWith(peerKey)) {
            initiatePeerConnection(peerKey);
          }
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state with ${peerKey}:`, pc.connectionState);
      };

      pc.onsignalingstatechange = () => {
        console.log(`[WebRTC] Signaling state with ${peerKey}:`, pc.signalingState);
      };
    }

    // Always attach any local tracks from localStreamRef to pc if not already added
    if (localStreamRef.current) {
      const senders = pc.getSenders();
      localStreamRef.current.getTracks().forEach((track) => {
        if (!senders.some((s) => s.track === track)) {
          console.log(`[WebRTC] Attaching local track ${track.kind} to peer ${peerKey}`);
          pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    return pc;
  };

  const initiatePeerConnection = async (targetUserId) => {
    try {
      const peerKey = String(targetUserId);
      const pc = getOrCreatePeerConnection(peerKey);

      if (pc.signalingState !== 'stable') {
        console.log(`[WebRTC] Peer ${peerKey} in state ${pc.signalingState}, waiting for stable to renegotiate`);
        const onStable = () => {
          if (pc.signalingState === 'stable') {
            pc.removeEventListener('signalingstatechange', onStable);
            initiatePeerConnection(peerKey);
          }
        };
        pc.addEventListener('signalingstatechange', onStable);
        return;
      }

      console.log(`[WebRTC] Initiating offer to peer ${peerKey}`);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      if (pc.signalingState !== 'stable') return;

      await pc.setLocalDescription(offer);
      sendSignal(peerKey, {
        type: 'offer',
        sdp: pc.localDescription,
      });
    } catch (err) {
      console.error(`[WebRTC] Error initiating peer connection with ${targetUserId}:`, err);
    }
  };

  const handleSignalMessage = async (fromUserId, signalData) => {
    try {
      if (!fromUserId || !signalData) return;
      const peerKey = String(fromUserId);
      const pc = getOrCreatePeerConnection(peerKey);

      if (signalData.type === 'offer') {
        const isPolite = !shouldInitiateWith(peerKey);
        const isCollision = pc.signalingState !== 'stable';

        if (isCollision) {
          if (!isPolite) {
            console.log(`[WebRTC] Glare collision with ${peerKey}: impolite peer ignoring offer`);
            return;
          }
          console.log(`[WebRTC] Glare collision with ${peerKey}: polite peer rolling back`);
          try {
            await pc.setLocalDescription({ type: 'rollback' });
          } catch (e) {
            console.warn('[WebRTC] Rollback error:', e);
          }
        }

        const sdpPayload = signalData.sdp?.sdp ? signalData.sdp : { type: 'offer', sdp: signalData.sdp };
        await pc.setRemoteDescription(new RTCSessionDescription(sdpPayload));

        if (pendingCandidatesRef.current[peerKey]) {
          for (const cand of pendingCandidatesRef.current[peerKey]) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch((e) =>
              console.warn('[WebRTC] Queued ICE candidate error:', e)
            );
          }
          delete pendingCandidatesRef.current[peerKey];
        }

        // Attach local tracks if available before answering
        if (localStreamRef.current) {
          const senders = pc.getSenders();
          localStreamRef.current.getTracks().forEach((track) => {
            if (!senders.some((s) => s.track === track)) {
              pc.addTrack(track, localStreamRef.current);
            }
          });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal(peerKey, {
          type: 'answer',
          sdp: pc.localDescription,
        });
      } else if (signalData.type === 'answer') {
        if (pc.signalingState === 'have-local-offer') {
          const sdpPayload = signalData.sdp?.sdp ? signalData.sdp : { type: 'answer', sdp: signalData.sdp };
          await pc.setRemoteDescription(new RTCSessionDescription(sdpPayload));

          if (pendingCandidatesRef.current[peerKey]) {
            for (const cand of pendingCandidatesRef.current[peerKey]) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch((e) =>
                console.warn('[WebRTC] Queued ICE candidate error:', e)
              );
            }
            delete pendingCandidatesRef.current[peerKey];
          }
        } else {
          console.warn(`[WebRTC] Ignored answer from ${peerKey} in state ${pc.signalingState}`);
        }
      } else if (signalData.type === 'candidate' && signalData.candidate) {
        try {
          const cand = new RTCIceCandidate(signalData.candidate);
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(cand);
          } else {
            if (!pendingCandidatesRef.current[peerKey]) {
              pendingCandidatesRef.current[peerKey] = [];
            }
            pendingCandidatesRef.current[peerKey].push(signalData.candidate);
          }
        } catch (e) {
          console.warn(`[WebRTC] Error adding ICE candidate from ${peerKey}:`, e);
        }
      }
    } catch (err) {
      console.error(`[WebRTC] Error handling signal from ${fromUserId}:`, err);
    }
  };

  // 1. Initial Fetch and Periodic Sync of participants & messages
  const refreshSessionData = async () => {
    try {
      const res = await api.get(`/sessions/${session.id}/`);
      const data = res.data;

      if (data.status === 'ENDED') {
        handleEndOrLeave();
        return;
      }

      if (data.participants) {
        const accepted = data.participants
          .filter((p) => p.status === 'ACCEPTED' && String(p.user.id) !== String(user?.id))
          .map((p) => ({
            user_id: p.user.id,
            username: p.user.username,
            is_audio_muted: p.is_audio_muted,
            is_video_off: p.is_video_off,
          }));
        setParticipants(accepted);

        // Check if any participant needs peer connection initiation
        accepted.forEach((p) => {
          const peerKey = String(p.user_id);
          if (!peerConnectionsRef.current[peerKey] && shouldInitiateWith(peerKey)) {
            initiatePeerConnection(peerKey);
          }
        });

        // Clean up connections for participants who left
        const acceptedIds = new Set(accepted.map((p) => String(p.user_id)));
        Object.keys(peerConnectionsRef.current).forEach((peerId) => {
          if (!acceptedIds.has(String(peerId))) {
            closePeerConnection(peerId);
          }
        });

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

  // Periodic polling every 3 seconds for ALL participants to ensure state consistency
  useEffect(() => {
    if (!session?.id) return;
    const interval = setInterval(refreshSessionData, 3000);
    return () => clearInterval(interval);
  }, [session.id, user?.id, isHost]);

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
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280, min: 640, max: 1920 },
              height: { ideal: 720, min: 480, max: 1080 },
              frameRate: { ideal: 30, min: 15, max: 60 },
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (camErr) {
          console.warn('[WebRTC] HD camera unavailable, trying standard video/audio:', camErr);
          try {
            localStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
          } catch (camErr2) {
            console.warn('[WebRTC] Camera completely unavailable, trying audio only:', camErr2);
            localStream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
            setIsVideoOff(true);
          }
        }

        setStream(localStream);
        localStreamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        if (minimizedVideoRef.current) {
          minimizedVideoRef.current.srcObject = localStream;
        }

        // Attach local tracks to all existing peer connections and renegotiate
        Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
          let added = false;
          localStream.getTracks().forEach((track) => {
            const senders = pc.getSenders();
            if (!senders.some((s) => s.track === track)) {
              pc.addTrack(track, localStream);
              added = true;
            }
          });
          optimizeVideoSender(pc);
          if (added || shouldInitiateWith(peerId)) {
            initiatePeerConnection(peerId);
          }
        });
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

        if (data.type === 'signal') {
          handleSignalMessage(data.from_user_id, data.signal_data);
        } else if (data.type === 'session_event') {
          if (data.event_type === 'chat_message') {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
            if (!sidebarOpenRef.current || sidebarTabRef.current !== 'chat') {
              setUnreadCount((c) => c + 1);
            }
          } else if (data.event_type === 'user_joined') {
            if (String(data.user_id) !== String(user?.id)) {
              setParticipants((prev) => {
                if (prev.some((p) => String(p.user_id) === String(data.user_id))) return prev;
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
              if (shouldInitiateWith(data.user_id)) {
                initiatePeerConnection(data.user_id);
              }
            }
          } else if (data.event_type === 'join_requested') {
            if (isHost) {
              setPendingRequests((prev) => {
                if (prev.some((p) => String(p.user_id) === String(data.user_id))) return prev;
                return [...prev, { user_id: data.user_id, username: data.username }];
              });
              setSidebarOpen(true);
              setSidebarTab('participants');
            }
          } else if (data.event_type === 'participant_approved') {
            setPendingRequests((prev) => prev.filter((p) => String(p.user_id) !== String(data.user_id)));
            if (String(data.user_id) !== String(user?.id)) {
              setParticipants((prev) => {
                if (prev.some((p) => String(p.user_id) === String(data.user_id))) return prev;
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
              if (shouldInitiateWith(data.user_id)) {
                initiatePeerConnection(data.user_id);
              }
            }
          } else if (data.event_type === 'participant_rejected') {
            setPendingRequests((prev) => prev.filter((p) => String(p.user_id) !== String(data.user_id)));
          } else if (data.event_type === 'media_state_changed') {
            setParticipants((prev) =>
              prev.map((p) =>
                String(p.user_id) === String(data.user_id)
                  ? { ...p, is_audio_muted: data.is_audio_muted, is_video_off: data.is_video_off }
                  : p
              )
            );
          } else if (data.event_type === 'user_left') {
            closePeerConnection(data.user_id);
            setParticipants((prev) => prev.filter((p) => String(p.user_id) !== String(data.user_id)));
            setPendingRequests((prev) => prev.filter((p) => String(p.user_id) !== String(data.user_id)));
          } else if (data.event_type === 'session_ended') {
            handleEndOrLeave();
          } else if (data.event_type === 'host_forced_mute') {
            if (String(data.target_user_id) === String(user?.id)) {
              if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach((t) => {
                  t.enabled = false;
                });
              }
              setIsAudioMuted(true);
              setModerationNotice('El anfitrión ha silenciado tu micrófono.');
              setTimeout(() => setModerationNotice(null), 6000);
            } else {
              setParticipants((prev) =>
                prev.map((p) =>
                  String(p.user_id) === String(data.target_user_id)
                    ? { ...p, is_audio_muted: true }
                    : p
                )
              );
            }
          } else if (data.event_type === 'host_forced_video_off') {
            if (String(data.target_user_id) === String(user?.id)) {
              if (localStreamRef.current) {
                localStreamRef.current.getVideoTracks().forEach((t) => {
                  t.enabled = false;
                });
              }
              setIsVideoOff(true);
              setModerationNotice('El anfitrión ha apagado tu cámara.');
              setTimeout(() => setModerationNotice(null), 6000);
            } else {
              setParticipants((prev) =>
                prev.map((p) =>
                  String(p.user_id) === String(data.target_user_id)
                    ? { ...p, is_video_off: true }
                    : p
                )
              );
            }
          } else if (data.event_type === 'host_forced_kick') {
            if (String(data.target_user_id) === String(user?.id)) {
              alert('Has sido expulsado de la reunión por el anfitrión.');
              handleEndOrLeave();
            } else {
              closePeerConnection(data.target_user_id);
              setParticipants((prev) => prev.filter((p) => String(p.user_id) !== String(data.target_user_id)));
            }
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
  }, [session.id, token, isHost, user?.id]);

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
          target_user_id: String(targetUserId),
          status: 'ACCEPTED',
        })
      );
    }
    setPendingRequests((prev) => prev.filter((p) => String(p.user_id) !== String(targetUserId)));
    refreshSessionData();
  };

  // Host Action: Reject Participant
  const handleRejectParticipant = async (targetUserId) => {
    await approveParticipant(session.id, targetUserId, 'REJECT');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'approve_participant',
          target_user_id: String(targetUserId),
          status: 'REJECTED',
        })
      );
    }
    setPendingRequests((prev) => prev.filter((p) => String(p.user_id) !== String(targetUserId)));
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
    Object.keys(peerConnectionsRef.current).forEach((peerId) => {
      closePeerConnection(peerId);
    });
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (isHost) {
      try {
        await endSession(session.id);
      } catch (err) {
        console.warn('Error ending session:', err);
      }
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
      <div className="fixed bottom-3 right-3 left-3 sm:left-auto sm:right-5 sm:bottom-5 z-50 w-auto sm:w-96 max-w-sm rounded-2xl bg-discord-chat shadow-2xl border-2 border-discord-blurple overflow-hidden flex flex-col select-none transition-all duration-300 ring-4 ring-black/40 animate-in fade-in slide-in-from-bottom-5">
        {/* Keep remote audio streams active while minimized */}
        <div className="sr-only">
          {participants.map((p) => (
            <audio
              key={p.user_id}
              ref={(el) => {
                if (el && remoteStreams[p.user_id] && el.srcObject !== remoteStreams[p.user_id]) {
                  el.srcObject = remoteStreams[p.user_id];
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
            />
          ))}
        </div>
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
            className="flex items-center space-x-1 sm:space-x-1.5 bg-discord-channels hover:bg-discord-hover text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition border border-white/10 shadow-sm flex-shrink-0"
            title="Regresar al chat de texto y minimizar la reunión en una ventana pequeña"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold hidden sm:inline">Volver al chat</span>
          </button>

          <div className="w-[1px] h-6 bg-white/10 hidden sm:block" />

          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-discord-blurple/20 text-discord-blurple flex-shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-white flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate max-w-[110px] sm:max-w-xs md:max-w-md">{session.title}</span>
                {isHost && (
                  <span className="text-[9px] sm:text-[10px] bg-discord-yellow/20 text-discord-yellow px-1.5 sm:px-2 py-0.5 rounded font-bold flex items-center gap-1 flex-shrink-0">
                    <Crown className="w-3 h-3" /> <span className="hidden xs:inline">Anfitrión</span>
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-discord-text-muted truncate max-w-[120px] sm:max-w-xs hidden xs:block">
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
          {moderationNotice && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-discord-red/90 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-white/20 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
              <span className="font-bold">{moderationNotice}</span>
              <button
                onClick={() => setModerationNotice(null)}
                className="ml-2 text-white/80 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {mediaError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-discord-yellow/20 border border-discord-yellow/40 text-discord-yellow text-xs px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{mediaError}</span>
            </div>
          )}

          <div className="w-full h-full max-h-[75vh] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 max-w-6xl mx-auto items-center">
            {/* Local User Video Card */}
            <div className="relative bg-discord-chat rounded-xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/5 h-44 sm:h-64 lg:h-80">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
              />

              {isVideoOff && (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-discord-blurple flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-xl">
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
              <RemoteParticipantCard
                key={participant.user_id}
                participant={participant}
                stream={remoteStreams[String(participant.user_id)] || remoteStreams[participant.user_id]}
                isHost={isHost}
                onHostMute={handleHostMute}
                onHostDisableVideo={handleHostDisableVideo}
                onHostKick={handleHostKick}
              />
            ))}
          </div>
        </main>

        {/* Right Toggleable Sidebar: Chat & Participants Panel */}
        {sidebarOpen && (
          <aside className="fixed inset-0 z-50 sm:static sm:z-20 sm:w-80 lg:w-96 bg-discord-sidebar border-l border-black/40 flex flex-col h-full shadow-2xl flex-shrink-0 transition-all duration-300">
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
                        className="flex items-center justify-between p-2 rounded-lg bg-discord-chat/40 text-xs hover:bg-discord-chat/60 transition"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-discord-channels text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0">
                            {p.username?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-discord-text font-medium truncate">
                            @{p.username} {!isHost && p.user_id === user?.id && '(Tú)'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          {/* Host Moderation Controls */}
                          {isHost && String(p.user_id) !== String(user?.id) && (
                            <div className="flex items-center space-x-0.5 bg-black/40 rounded p-0.5 mr-1 border border-white/5">
                              <button
                                onClick={() => handleHostMute(p.user_id)}
                                className={`p-1 rounded transition ${
                                  p.is_audio_muted
                                    ? 'text-discord-red bg-discord-red/20'
                                    : 'text-discord-text-muted hover:text-white hover:bg-white/10'
                                }`}
                                title={p.is_audio_muted ? 'Micrófono ya silenciado' : 'Silenciar micrófono'}
                              >
                                <MicOff className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleHostDisableVideo(p.user_id)}
                                className={`p-1 rounded transition ${
                                  p.is_video_off
                                    ? 'text-discord-yellow bg-discord-yellow/20'
                                    : 'text-discord-text-muted hover:text-white hover:bg-white/10'
                                }`}
                                title={p.is_video_off ? 'Cámara ya apagada' : 'Apagar cámara'}
                              >
                                <VideoOff className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleHostKick(p.user_id)}
                                className="p-1 rounded text-discord-red hover:text-white hover:bg-discord-red transition"
                                title="Expulsar de la reunión"
                              >
                                <UserX className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Media status indicators */}
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
      <footer className="h-16 sm:h-20 bg-discord-sidebar px-2 sm:px-6 flex items-center justify-center space-x-1 sm:space-x-3 md:space-x-4 border-t border-black/40 flex-shrink-0">
        {/* Toggle Microphone */}
        <button
          onClick={toggleAudio}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl transition shadow-lg ${
            isAudioMuted
              ? 'bg-discord-red text-white hover:bg-discord-red/90'
              : 'bg-discord-channels text-white hover:bg-discord-hover'
          }`}
          title={isAudioMuted ? 'Activar micrófono' : 'Desactivar micrófono'}
        >
          {isAudioMuted ? <MicOff className="w-4 h-4 sm:w-6 sm:h-6" /> : <Mic className="w-4 h-4 sm:w-6 sm:h-6" />}
          <span className="text-[8px] sm:text-[9px] mt-0.5 sm:mt-1 font-medium">{isAudioMuted ? 'Silencio' : 'Mic'}</span>
        </button>

        {/* Toggle Camera */}
        <button
          onClick={toggleVideo}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl transition shadow-lg ${
            isVideoOff
              ? 'bg-discord-red text-white hover:bg-discord-red/90'
              : 'bg-discord-channels text-white hover:bg-discord-hover'
          }`}
          title={isVideoOff ? 'Activar cámara' : 'Desactivar cámara'}
        >
          {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-6 sm:h-6" /> : <Video className="w-4 h-4 sm:w-6 sm:h-6" />}
          <span className="text-[8px] sm:text-[9px] mt-0.5 sm:mt-1 font-medium">{isVideoOff ? 'Cámara off' : 'Cámara'}</span>
        </button>

        {/* Flip Camera (Front/Rear for Mobile & Web) */}
        <button
          onClick={toggleCameraFacing}
          className="flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl transition shadow-lg bg-discord-channels text-white hover:bg-discord-hover"
          title={`Cambiar cámara (${facingMode === 'user' ? 'Frontal' : 'Trasera'})`}
        >
          <RotateCcw className={`w-4 h-4 sm:w-6 sm:h-6 ${facingMode === 'environment' ? 'text-discord-blurple rotate-180 transition-transform' : ''}`} />
          <span className="text-[8px] sm:text-[9px] mt-0.5 sm:mt-1 font-medium">Voltear</span>
        </button>

        {/* Toggle In-Meeting Chat Sidebar (Available to Host & All Members) */}
        <button
          onClick={() => toggleSidebarTab('chat')}
          className={`relative flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl transition shadow-lg ${
            sidebarOpen && sidebarTab === 'chat'
              ? 'bg-discord-blurple text-white ring-2 ring-discord-blurple/50'
              : 'bg-discord-channels text-white hover:bg-discord-hover'
          }`}
          title="Abrir chat de la reunión"
        >
          <MessageSquare className="w-4 h-4 sm:w-6 sm:h-6" />
          <span className="text-[8px] sm:text-[9px] mt-0.5 sm:mt-1 font-medium">Chat</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full bg-discord-red text-white text-[9px] sm:text-[10px] font-bold animate-bounce shadow">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Toggle Participants / Waiting Room Sidebar */}
        <button
          onClick={() => toggleSidebarTab('participants')}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl transition shadow-lg ${
            sidebarOpen && sidebarTab === 'participants'
              ? 'bg-discord-blurple text-white ring-2 ring-discord-blurple/50'
              : 'bg-discord-channels text-white hover:bg-discord-hover'
          }`}
          title={isHost ? 'Ver integrantes y sala de espera' : 'Ver integrantes'}
        >
          <Users className="w-4 h-4 sm:w-6 sm:h-6" />
          <span className="text-[8px] sm:text-[9px] mt-0.5 sm:mt-1 font-medium">Personas</span>
        </button>

        {/* Return to Chat / Minimize to Floating PiP */}
        <button
          onClick={() => setIsMinimized(true)}
          className="flex flex-col items-center justify-center px-2.5 sm:px-4 h-11 sm:h-14 rounded-xl sm:rounded-2xl bg-discord-channels hover:bg-discord-hover text-white transition shadow-lg border border-white/10"
          title="Minimizar reunión a ventana pequeña para volver al chat de texto"
        >
          <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5 text-discord-blurple" />
          <span className="text-[8px] sm:text-[9px] mt-0.5 sm:mt-1 font-semibold text-white">Minimizar</span>
        </button>

        {/* Leave or End Session */}
        <button
          onClick={handleEndOrLeave}
          className="flex flex-col items-center justify-center px-3 sm:px-5 h-11 sm:h-14 rounded-xl sm:rounded-2xl bg-discord-red text-white hover:bg-discord-red/90 transition shadow-lg ml-0.5 sm:ml-1"
          title={isHost ? 'Finalizar sesión para todos' : 'Salir de la reunión'}
        >
          <PhoneOff className="w-4 h-4 sm:w-6 sm:h-6" />
          <span className="text-[8px] sm:text-[10px] mt-0.5 sm:mt-1 font-bold">
            {isHost ? 'Finalizar' : 'Salir'}
          </span>
        </button>
      </footer>
    </div>
  );
}
