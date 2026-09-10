import { create } from 'zustand';
import api from '../api/client';

export const useChatStore = create((set, get) => ({
  messages: [],
  loading: false,
  typingUsers: {},

  fetchMessages: async (channelId) => {
    if (!channelId) return;
    set({ loading: true, messages: [] });
    try {
      const res = await api.get(`/chat/messages/?channel=${channelId}`);
      set({ messages: res.data, loading: false });
    } catch (err) {
      console.error('Error fetching messages', err);
      set({ loading: false });
    }
  },

  addMessage: (message) => {
    set(state => {
      // Avoid duplicate message IDs
      if (state.messages.some(m => m.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    });
  },

  updateMessageReactions: (messageId, reactions) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === messageId ? { ...m, reactions } : m
      ),
    }));
  },

  setTypingUser: (userId, username, isTyping) => {
    set(state => {
      const updated = { ...state.typingUsers };
      if (isTyping) {
        updated[userId] = username;
      } else {
        delete updated[userId];
      }
      return { typingUsers: updated };
    });
  },

  clearChat: () => {
    set({ messages: [], typingUsers: {} });
  },
}));
