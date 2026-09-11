import { create } from 'zustand';
import { useChatStore } from './chatStore';
import { useDMStore } from './dmStore';
import { useServerStore } from './serverStore';

function getGatewayWsUrl(token) {
  const rawWs = import.meta.env.VITE_WS_URL;
  let baseWsUrl = '';
  if (rawWs && rawWs.trim() !== '') {
    const clean = rawWs.trim().replace(/\/+$/, '').replace(/\/ws\/?$/, '');
    const protocol = clean.startsWith('wss://') || window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = clean.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
    baseWsUrl = `${protocol}//${host}`;
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    baseWsUrl = `${protocol}//${window.location.host}`;
  }
  return `${baseWsUrl}/ws/gateway/?token=${token}`;
}

let wsInstance = null;
let pingInterval = null;
let reconnectTimer = null;
let listenersInitialized = false;

export const useSocketStore = create((set, get) => ({
  isConnected: false,
  isConnecting: false,
  token: null,
  activeChannelId: null,
  activeConversationId: null,

  connect: (token) => {
    if (!token) return;
    const currentToken = get().token;

    // If already connected with same token, ensure active subscriptions and keep alive
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN && currentToken === token) {
      set({ isConnected: true, isConnecting: false });
      return;
    }

    // Set new token
    set({ token, isConnecting: true });

    // Clean up existing socket & timers
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (wsInstance) {
      try {
        wsInstance.close(1000);
      } catch (e) {
        // ignore
      }
      wsInstance = null;
    }

    const wsUrl = getGatewayWsUrl(token);
    try {
      const ws = new WebSocket(wsUrl);
      wsInstance = ws;

      ws.onopen = () => {
        if (wsInstance !== ws) return;
        set({ isConnected: true, isConnecting: false });

        // Start 20s heartbeat ping
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
            try {
              wsInstance.send(JSON.stringify({ type: 'ping' }));
            } catch (e) {
              // ignore
            }
          }
        }, 20000);

        // Resubscribe active channel if any
        const channelId = get().activeChannelId;
        if (channelId) {
          try {
            ws.send(JSON.stringify({ type: 'subscribe_channel', channel_id: channelId }));
          } catch (e) {}
        }

        // Resubscribe active DM if any
        const convId = get().activeConversationId;
        if (convId) {
          try {
            ws.send(JSON.stringify({ type: 'subscribe_dm', conversation_id: convId }));
          } catch (e) {}
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;

          if (type === 'pong' || type === 'ready') {
            return;
          }

          if (type === 'chat_message') {
            useChatStore.getState().addMessage(data.message);
          } else if (type === 'dm_message') {
            useDMStore.getState().addMessage(data.message);
          } else if (type === 'message_reaction') {
            if (data.is_dm) {
              useDMStore.getState().updateMessageReactions(data.message_id, data.reactions);
            } else {
              useChatStore.getState().updateMessageReactions(data.message_id, data.reactions);
            }
          } else if (type === 'message_deleted') {
            useChatStore.getState().removeMessageById(data.message_id);
          } else if (type === 'clear_chat') {
            useDMStore.getState().handleClearChat(data.conversation_id);
          } else if (type === 'conversation_status') {
            useDMStore.getState().setConversationStatus(data.conversation_id, data.status);
            useDMStore.getState().fetchConversations();
          } else if (type === 'conversation_deleted') {
            useDMStore.getState().handleConversationDeleted(data.conversation_id);
          } else if (type === 'typing') {
            if (data.channel_id) {
              useChatStore.getState().setTypingUser(data.user_id, data.username, data.is_typing);
            }
            if (data.conversation_id) {
              useDMStore.getState().setTypingUser(data.username, data.is_typing);
            }
          } else if (type === 'presence') {
            useServerStore.getState().updateMemberPresence(data.user_id, data.is_online);
          }
        } catch (err) {
          console.error('Error parsing gateway WS message:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('Gateway WS error', err);
      };

      ws.onclose = (event) => {
        if (wsInstance !== ws) return;
        set({ isConnected: false, isConnecting: false });
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }

        // Auto-reconnect if not closed by user logout or unauthorized
        if (event.code !== 1000 && event.code !== 4001 && event.code !== 4003) {
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              const savedToken = get().token;
              if (savedToken) {
                get().connect(savedToken);
              }
            }, 2500);
          }
        }
      };
    } catch (e) {
      console.error('Failed to create Gateway WebSocket:', e);
      set({ isConnected: false, isConnecting: false });
    }

    // Set up global tab-switching / online listeners once
    if (!listenersInitialized && typeof window !== 'undefined') {
      listenersInitialized = true;

      const handleWakeup = () => {
        const state = get();
        if (
          state.token &&
          (!wsInstance || wsInstance.readyState === WebSocket.CLOSED || wsInstance.readyState === WebSocket.CLOSING)
        ) {
          state.connect(state.token);
        }
      };

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          handleWakeup();
        }
      });

      window.addEventListener('focus', handleWakeup);
      window.addEventListener('online', handleWakeup);
    }
  },

  disconnect: () => {
    set({ token: null, isConnected: false, isConnecting: false });
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (wsInstance) {
      try {
        wsInstance.close(1000);
      } catch (e) {}
      wsInstance = null;
    }
  },

  subscribeChannel: (channelId) => {
    set({ activeChannelId: channelId });
    if (!channelId) return;
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      try {
        wsInstance.send(JSON.stringify({ type: 'subscribe_channel', channel_id: channelId }));
      } catch (e) {}
    }
  },

  unsubscribeChannel: () => {
    set({ activeChannelId: null });
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      try {
        wsInstance.send(JSON.stringify({ type: 'unsubscribe_channel' }));
      } catch (e) {}
    }
  },

  subscribeDM: (conversationId) => {
    set({ activeConversationId: conversationId });
    if (!conversationId) return;
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      try {
        wsInstance.send(JSON.stringify({ type: 'subscribe_dm', conversation_id: conversationId }));
      } catch (e) {}
    }
  },

  sendChatMessage: (channelId, content) => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      try {
        wsInstance.send(JSON.stringify({
          type: 'chat_message',
          channel_id: channelId,
          content,
        }));
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  },

  sendDMMessage: (conversationId, content) => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      try {
        wsInstance.send(JSON.stringify({
          type: 'dm_message',
          conversation_id: conversationId,
          content,
        }));
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  },

  sendTyping: (isTyping, channelId = null, conversationId = null) => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      try {
        wsInstance.send(JSON.stringify({
          type: 'typing',
          is_typing: isTyping,
          channel_id: channelId,
          conversation_id: conversationId,
        }));
      } catch (e) {}
    }
  },
}));
