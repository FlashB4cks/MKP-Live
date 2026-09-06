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
  setActiveSession: (session) => set({ activeSession: session, sessionDetails: session }),

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
          p.user.id === userId ? updatedParticipant : p
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

  leaveActiveSession: () => {
    set({ activeSession: null, sessionDetails: null, isMinimized: false });
  },
}));
