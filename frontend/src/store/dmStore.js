import { create } from 'zustand';
import api from '../api/client';
import { useServerStore } from './serverStore';
import { useAuthStore } from './authStore';

export const useDMStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  viewMode: 'chat', // 'chat' | 'requests'
  messages: [],
  loading: false,
  typingUser: null,

  setViewMode: (mode) =>
    set({
      viewMode: mode,
      activeConversation: mode === 'requests' ? null : get().activeConversation,
    }),

  openRequestsView: () => {
    useServerStore.getState().setDMView();
    set({ activeConversation: null, viewMode: 'requests', messages: [], typingUser: null });
  },

  fetchConversations: async () => {
    try {
      const res = await api.get('/chat/dms/');
      set({ conversations: res.data });
      return res.data;
    } catch (err) {
      console.error('Error fetching DM conversations', err);
      return [];
    }
  },

  selectConversation: async (conversation) => {
    useServerStore.getState().setDMView();
    // Immediately clear unread_count for this conversation in UI
    set((state) => ({
      activeConversation: conversation ? { ...conversation, unread_count: 0 } : null,
      viewMode: 'chat',
      conversations: state.conversations.map((c) =>
        c.id === conversation?.id ? { ...c, unread_count: 0 } : c
      ),
      messages: [],
      loading: true,
      typingUser: null,
    }));
    if (!conversation?.id) return;
    try {
      const res = await api.get(`/chat/dms/${conversation.id}/messages/`);
      set((state) => {
        // Only apply if the user hasn't switched to another conversation
        if (state.activeConversation?.id !== conversation.id) return state;

        // Merge incoming messages with any optimistic/in-flight messages
        const msgMap = new Map();
        res.data.forEach((m) => msgMap.set(String(m.id), m));

        // Preserve any optimistic messages or messages that arrived while request was in-flight
        state.messages.forEach((m) => {
          const key = String(m.id);
          if (!msgMap.has(key)) {
            msgMap.set(key, m);
          }
        });

        const sorted = Array.from(msgMap.values()).sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );

        return {
          messages: sorted,
          loading: false,
          conversations: state.conversations.map((c) =>
            c.id === conversation.id ? { ...c, unread_count: 0 } : c
          ),
        };
      });
    } catch (err) {
      console.error('Error fetching DM messages', err);
      set({ loading: false });
    }
  },

  startDirectMessage: async (targetUserId, username = null) => {
    try {
      useServerStore.getState().setDMView();
      const payload = targetUserId ? { target_user_id: targetUserId } : { username };
      const res = await api.post('/chat/dms/', payload);
      const conversation = res.data;

      set((state) => {
        const exists = state.conversations.some((c) => c.id === conversation.id);
        const updated = exists
          ? state.conversations.map((c) => (c.id === conversation.id ? conversation : c))
          : [conversation, ...state.conversations];
        return {
          conversations: updated,
          activeConversation: conversation,
        };
      });

      await get().selectConversation(conversation);
      return { success: true, conversation };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al iniciar mensaje directo';
      return { success: false, error: errorMsg };
    }
  },

  fetchMessages: async (conversationId) => {
    if (!conversationId) return;
    try {
      const res = await api.get(`/chat/dms/${conversationId}/messages/`);
      set({ messages: res.data });
    } catch (err) {
      console.error('Error fetching DM messages', err);
    }
  },

  addMessage: (message) => {
    set((state) => {
      // If message already exists by real id, ignore
      if (state.messages.some((m) => String(m.id) === String(message.id))) {
        return state;
      }

      // Check if there's a matching optimistic message to replace
      const optimisticIndex = state.messages.findIndex(
        (m) =>
          m.is_optimistic &&
          m.content === message.content &&
          String(m.sender?.id) === String(message.sender?.id)
      );

      let updatedMessages;
      if (optimisticIndex !== -1) {
        updatedMessages = [...state.messages];
        updatedMessages[optimisticIndex] = message;
      } else {
        updatedMessages = [...state.messages, message];
      }

      // Also update last message and unread count in conversation list
      const isActive =
        state.activeConversation &&
        (String(state.activeConversation.id) === String(message.conversation) ||
          String(state.activeConversation.id) === String(message.conversation_id));

      const updatedConversations = state.conversations.map((conv) => {
        const matches =
          String(conv.id) === String(message.conversation) ||
          String(conv.id) === String(message.conversation_id) ||
          (isActive && String(conv.id) === String(state.activeConversation.id));

        if (matches) {
          return {
            ...conv,
            last_message: message,
            updated_at: message.created_at,
            unread_count: isActive ? 0 : (conv.unread_count || 0) + 1,
          };
        }
        return conv;
      });

      return {
        messages: updatedMessages,
        conversations: updatedConversations,
      };
    });
  },

  updateMessageReactions: (messageId, reactions) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        String(m.id) === String(messageId) ? { ...m, reactions } : m
      ),
    }));
  },

  sendDirectMessage: async (content) => {
    const activeConv = get().activeConversation;
    if (!activeConv?.id || !content.trim()) return;

    const text = content.trim();
    const currentUser = useAuthStore.getState().user;
    const tempId = `temp-${Date.now()}`;

    // Optimistic UI update: instantly render message in UI
    const optimisticMsg = {
      id: tempId,
      conversation: activeConv.id,
      sender: currentUser,
      content: text,
      reactions: {},
      created_at: new Date().toISOString(),
      is_optimistic: true,
    };

    set((state) => ({
      messages: [...state.messages, optimisticMsg],
    }));

    try {
      const res = await api.post(`/chat/dms/${activeConv.id}/messages/`, { content: text });
      const newMsg = res.data;

      // Replace optimistic message with actual persisted message
      set((state) => ({
        messages: state.messages.map((m) => (m.id === tempId ? newMsg : m)),
      }));

      return { success: true, message: newMsg };
    } catch (err) {
      console.error('Error sending DM', err);
      // Remove optimistic message on failure
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== tempId),
      }));
      const errorMsg = err.response?.data?.detail || 'Error al enviar mensaje';
      return { success: false, error: errorMsg };
    }
  },

  acceptDMRequest: async (conversationId) => {
    try {
      const res = await api.post(`/chat/dms/${conversationId}/accept/`);
      const updatedConv = res.data;
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conversationId ? updatedConv : c)),
        activeConversation:
          state.activeConversation?.id === conversationId ? updatedConv : state.activeConversation,
      }));
      return { success: true, conversation: updatedConv };
    } catch (err) {
      console.error('Error accepting DM request', err);
      return {
        success: false,
        error: err.response?.data?.detail || 'Error al aceptar solicitud',
      };
    }
  },

  rejectDMRequest: async (conversationId) => {
    try {
      await api.post(`/chat/dms/${conversationId}/reject/`);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        activeConversation:
          state.activeConversation?.id === conversationId ? null : state.activeConversation,
        messages: state.activeConversation?.id === conversationId ? [] : state.messages,
      }));
      return { success: true };
    } catch (err) {
      console.error('Error rejecting DM request', err);
      return {
        success: false,
        error: err.response?.data?.detail || 'Error al rechazar solicitud',
      };
    }
  },

  clearConversationMessages: async (conversationId) => {
    try {
      await api.post(`/chat/dms/${conversationId}/clear/`);
      set((state) => ({
        messages: state.activeConversation?.id === conversationId ? [] : state.messages,
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, last_message: null } : c
        ),
      }));
      return { success: true };
    } catch (err) {
      console.error('Error clearing conversation', err);
      return {
        success: false,
        error: err.response?.data?.detail || 'Error al vaciar conversación',
      };
    }
  },

  deleteConversation: async (conversationId) => {
    try {
      await api.delete(`/chat/dms/${conversationId}/delete/`);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        activeConversation:
          state.activeConversation?.id === conversationId ? null : state.activeConversation,
        messages: state.activeConversation?.id === conversationId ? [] : state.messages,
      }));
      return { success: true };
    } catch (err) {
      console.error('Error deleting conversation', err);
      return {
        success: false,
        error: err.response?.data?.detail || 'Error al eliminar conversación',
      };
    }
  },

  setConversationStatus: (conversationId, status) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              status,
              is_pending: status === 'PENDING',
              can_chat: status === 'ACCEPTED',
            }
          : c
      ),
      activeConversation:
        state.activeConversation?.id === conversationId
          ? {
              ...state.activeConversation,
              status,
              is_pending: status === 'PENDING',
              can_chat: status === 'ACCEPTED',
            }
          : state.activeConversation,
    }));
  },

  setTypingUser: (username, isTyping) => {
    set({
      typingUser: isTyping ? username : null,
    });
  },

  handleClearChat: (conversationId) => {
    set((state) => ({
      messages: state.activeConversation?.id === conversationId ? [] : state.messages,
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, last_message: null } : c
      ),
    }));
  },

  handleConversationDeleted: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      activeConversation:
        state.activeConversation?.id === conversationId ? null : state.activeConversation,
      messages: state.activeConversation?.id === conversationId ? [] : state.messages,
    }));
  },

  clearActiveConversation: () => {
    set({ activeConversation: null, messages: [], typingUser: null, viewMode: 'chat' });
  },
}));
