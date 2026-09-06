import { create } from 'zustand';
import api from '../api/client';

export const useSessionStore = create((set, get) => ({
  sessions: [],
  activeSession: null,
  sessionDetails: null,
  isMinimized: false,
  vpnStatus: null,
  loading: false,

  setIsMinimized: (isMinimized) => set({ isMinimized }),
  setActiveSession: (session) => {
    if (session?.id) {
      localStorage.setItem('active_session_id', String(session.id));
    }
    set({ activeSession: session, sessionDetails: session });
  },

  restoreActiveSession: async () => {
    const savedId = localStorage.getItem('active_session_id');
    if (!savedId) return null;
    try {
      const res = await api.get(`/sessions/${savedId}/`);
      const session = res.data;
      if (session && session.status !== 'ENDED') {
        set({
          activeSession: session,
          sessionDetails: session,
          isMinimized: false,
        });
        return session;
      } else {
        localStorage.removeItem('active_session_id');
        return null;
      }
    } catch (err) {
      console.warn('Could not restore active session', err);
      localStorage.removeItem('active_session_id');
      return null;
    }
  },

  checkVPNStatus: async () => {
    try {
      const res = await api.get('/sessions/vpn-status/');
      set({ vpnStatus: res.data });
      return res.data;
    } catch (err) {
      console.error('Error checking VPN status', err);
      return { is_vpn_authorized: true, client_ip: '127.0.0.1' };
    }
  },

  fetchSessions: async (serverId) => {
    if (!serverId) return;
    set({ loading: true });
    try {
      const res = await api.get(`/sessions/?server=${serverId}`);
      set({ sessions: res.data, loading: false });
    } catch (err) {
      console.error('Error fetching sessions', err);
      set({ loading: false });
    }
  },

  scheduleSession: async (sessionData) => {
    try {
      const res = await api.post('/sessions/', sessionData);
      const newSession = res.data;
      set((state) => ({
        sessions: [newSession, ...state.sessions.filter((s) => s.id !== newSession.id)],
      }));
      if (sessionData.server) {
        await get().fetchSessions(sessionData.server);
      }
      return { success: true, session: newSession };
    } catch (err) {
      const errorMsg =
        err.response?.data?.scheduled_at?.[0] ||
        err.response?.data?.title?.[0] ||
        err.response?.data?.detail ||
        'Error al programar la sesión';
      return { success: false, error: errorMsg };
    }
  },

  startInstantSession: async (serverId, title = '') => {
    try {
      const res = await api.post('/sessions/instant/', {
        server: serverId,
        title,
      });
      const newSession = res.data;
      if (newSession?.id) {
        localStorage.setItem('active_session_id', String(newSession.id));
      }
      set((state) => ({
        activeSession: newSession,
        sessionDetails: newSession,
        isMinimized: false,
        sessions: [newSession, ...state.sessions.filter((s) => s.id !== newSession.id)],
      }));
      return { success: true, session: newSession };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al iniciar sesión instantánea';
      return { success: false, error: errorMsg };
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await api.delete(`/sessions/${sessionId}/`);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Error al cancelar la sesión' };
    }
  },

  startSession: async (sessionId) => {
    try {
      const res = await api.post(`/sessions/${sessionId}/start/`);
      const updated = res.data;
      if (updated?.id) {
        localStorage.setItem('active_session_id', String(updated.id));
      }
      set((state) => ({
        activeSession: updated,
        sessionDetails: updated,
        isMinimized: false,
        sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, status: 'ACTIVE' } : s)),
      }));
      return { success: true, session: updated };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al iniciar la sesión';
      return { success: false, error: errorMsg };
    }
  },

  endSession: async (sessionId) => {
    try {
      await api.post(`/sessions/${sessionId}/end/`);
      localStorage.removeItem('active_session_id');
      set((state) => ({
        activeSession: null,
        sessionDetails: null,
        isMinimized: false,
        sessions: state.sessions.filter((s) => s.id !== sessionId),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Error al finalizar sesión' };
    }
  },

  requestJoinSession: async (sessionId) => {
    try {
      const res = await api.post(`/sessions/${sessionId}/join/`);
      const { participant_status, session } = res.data;
      if (participant_status === 'ACCEPTED') {
        if (session?.id) {
          localStorage.setItem('active_session_id', String(session.id));
        }
        set({
          activeSession: session,
          sessionDetails: session,
          isMinimized: false,
        });
      }
      return { success: true, participant_status, session };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al unirse a la sesión';
      return { success: false, error: errorMsg };
    }
  },

  approveParticipant: async (sessionId, userId, action) => {
    try {
      const res = await api.post(`/sessions/${sessionId}/participants/${userId}/approve/`, {
        action,
      });
      const updatedParticipant = res.data;
      set((state) => {
        if (!state.sessionDetails) return state;
        const updatedList = (state.sessionDetails.participants || []).map((p) =>
          String(p.user.id) === String(userId) ? updatedParticipant : p
        );
        return {
          sessionDetails: { ...state.sessionDetails, participants: updatedList },
        };
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Error al procesar solicitud' };
    }
  },

  moderateParticipant: async (sessionId, userId, action) => {
    try {
      const res = await api.post(`/sessions/${sessionId}/participants/${userId}/moderate/`, {
        action,
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Error al moderar participante' };
    }
  },

  leaveActiveSession: async (sessionId) => {
    localStorage.removeItem('active_session_id');
    if (sessionId) {
      try {
        await api.post(`/sessions/${sessionId}/leave/`);
      } catch (err) {
        console.warn('Error reporting leave session:', err);
      }
    }
    set({ activeSession: null, sessionDetails: null, isMinimized: false });
  },
}));
