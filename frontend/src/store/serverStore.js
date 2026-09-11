import { create } from 'zustand';
import api from '../api/client';

export const useServerStore = create((set, get) => ({
  servers: [],
  activeServer: null,
  activeChannel: null,
  isDMView: false,
  loading: false,

  setDMView: () => {
    set({ isDMView: true, activeServer: null, activeChannel: null, members: [] });
  },

  fetchServers: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/servers/');
      const servers = res.data;
      set({ servers, loading: false });

      // If activeServer is not selected or no longer in servers, select the first one (if not in DM mode)
      const currentActive = get().activeServer;
      const inDM = get().isDMView;
      if (!inDM && servers.length > 0 && (!currentActive || !servers.find(s => s.id === currentActive.id))) {
        get().selectServer(servers[0]);
      } else if (servers.length === 0 && !inDM) {
        set({ activeServer: null, activeChannel: null, members: [] });
      }
    } catch (err) {
      console.error('Error fetching servers', err);
      set({ loading: false });
    }
  },

  selectServer: async (server) => {
    if (!server) {
      set({ isDMView: true, activeServer: null, activeChannel: null, members: [] });
      return;
    }
    set({ isDMView: false });
    try {
      // Fetch full details with channels and members
      const res = await api.get(`/servers/${server.id}/`);
      const serverDetail = res.data;
      const channels = serverDetail.channels || [];
      const members = serverDetail.members || [];

      // Pick general or first text channel
      const defaultChannel = channels.find(c => c.name === 'general') || channels[0] || null;

      set({
        activeServer: serverDetail,
        activeChannel: defaultChannel,
        members: members,
        isDMView: false,
      });
    } catch (err) {
      console.error('Error fetching server details', err);
    }
  },

  selectChannel: (channel) => {
    set({ activeChannel: channel });
  },

  createServer: async (name, description = '') => {
    try {
      const res = await api.post('/servers/', { name, description });
      const newServer = res.data;
      set(state => ({ servers: [newServer, ...state.servers] }));
      await get().selectServer(newServer);
      return { success: true, server: newServer };
    } catch (err) {
      const errorMsg = err.response?.data?.name?.[0] || 'Error al crear servidor';
      return { success: false, error: errorMsg };
    }
  },

  joinServer: async (inviteCode) => {
    try {
      const res = await api.post('/servers/join/', { invite_code: inviteCode });
      const server = res.data;
      // Refresh server list
      await get().fetchServers();
      await get().selectServer(server);
      return { success: true, server };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Invitación inválida o expirada';
      return { success: false, error: errorMsg };
    }
  },

  createChannel: async (serverId, name, topic = '') => {
    try {
      const res = await api.post('/channels/', {
        server: serverId,
        name,
        topic,
      });
      const newChannel = res.data;
      set(state => {
        if (!state.activeServer || state.activeServer.id !== serverId) return state;
        const updatedChannels = [...(state.activeServer.channels || []), newChannel];
        return {
          activeServer: { ...state.activeServer, channels: updatedChannels },
          activeChannel: newChannel,
        };
      });
      return { success: true, channel: newChannel };
    } catch (err) {
      const errorMsg = err.response?.data?.name?.[0] || 'Error al crear canal';
      return { success: false, error: errorMsg };
    }
  },

  createInvite: async (serverId, maxUses = 0) => {
    try {
      const res = await api.post(`/servers/${serverId}/invites/`, {
        max_uses: maxUses,
      });
      return { success: true, invite: res.data };
    } catch (err) {
      return { success: false, error: 'Error al generar invitación' };
    }
  },

  deleteServer: async (serverId) => {
    try {
      await api.delete(`/servers/${serverId}/`);
      set(state => {
        const remainingServers = state.servers.filter(s => s.id !== serverId);
        return {
          servers: remainingServers,
          activeServer: null,
          activeChannel: null,
          members: [],
        };
      });
      // Select first remaining server if available
      const remaining = get().servers;
      if (remaining.length > 0) {
        await get().selectServer(remaining[0]);
      }
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al eliminar servidor';
      return { success: false, error: errorMsg };
    }
  },

  deleteChannel: async (channelId) => {
    try {
      await api.delete(`/channels/${channelId}/`);
      set(state => {
        if (!state.activeServer) return state;
        const updatedChannels = (state.activeServer.channels || []).filter(c => c.id !== channelId);
        let nextChannel = state.activeChannel;
        if (state.activeChannel?.id === channelId) {
          nextChannel = updatedChannels[0] || null;
        }
        return {
          activeServer: { ...state.activeServer, channels: updatedChannels },
          activeChannel: nextChannel,
        };
      });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al eliminar canal';
      return { success: false, error: errorMsg };
    }
  },

  updateMemberPresence: (userId, isOnline) => {
    set(state => ({
      members: state.members.map(member => {
        if (member.user.id === userId) {
          return {
            ...member,
            user: { ...member.user, is_online: isOnline },
          };
        }
        return member;
      }),
    }));
  },

  kickMember: async (serverId, memberId) => {
    try {
      await api.delete(`/servers/${serverId}/members/${memberId}/`);
      set(state => ({
        members: state.members.filter(m => m.id !== memberId),
      }));
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al expulsar miembro';
      return { success: false, error: errorMsg };
    }
  },

  updateMemberPermissions: async (serverId, memberId, data) => {
    try {
      const res = await api.patch(`/servers/${serverId}/members/${memberId}/`, data);
      set(state => ({
        members: state.members.map(m => m.id === memberId ? res.data : m),
      }));
      return { success: true, member: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al actualizar permisos';
      return { success: false, error: errorMsg };
    }
  },
}));
