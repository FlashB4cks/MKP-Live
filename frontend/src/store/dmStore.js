import { create } from 'zustand';
import api from '../api/client';
import { useServerStore } from './serverStore';

export const useDMStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  loading: false,
  typingUser: null,

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
    set({ activeConversation: conversation, messages: [], loading: true, typingUser: null });
    if (!conversation?.id) return;
    try {
      const res = await api.get(`/chat/dms/${conversation.id}/messages/`);
      set({ messages: res.data, loading: false });
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
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      // Also update last message in conversation list
      const updatedConversations = state.conversations.map((conv) => {
        if (conv.id === message.conversation || (state.activeConversation && conv.id === state.activeConversation.id)) {
          return { ...conv, last_message: message, updated_at: message.created_at };
        }
        return conv;
      });

      return {
        messages: [...state.messages, message],
        conversations: updatedConversations,
      };
    });
  },

  updateMessageReactions: (messageId, reactions) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === messageId ? { ...m, reactions } : m
      ),
    }));
  },

  sendDirectMessage: async (content) => {
    const activeConv = get().activeConversation;
    if (!activeConv?.id || !content.trim()) return;

    try {
      const res = await api.post(`/chat/dms/${activeConv.id}/messages/`, { content: content.trim() });
      const newMsg = res.data;
      get().addMessage(newMsg);
      return { success: true, message: newMsg };
    } catch (err) {
      console.error('Error sending DM', err);
      return { success: false, error: 'Error al enviar mensaje' };
    }
  },

  setTypingUser: (username, isTyping) => {
    set({
      typingUser: isTyping ? username : null,
    });
  },

  clearActiveConversation: () => {
    set({ activeConversation: null, messages: [], typingUser: null });
  },
}));
