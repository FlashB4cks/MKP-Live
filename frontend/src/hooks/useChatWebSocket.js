import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useServerStore } from '../store/serverStore';

export function useChatWebSocket(channelId, token) {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const addMessage = useChatStore((state) => state.addMessage);
  const setTypingUser = useChatStore((state) => state.setTypingUser);
  const updateMemberPresence = useServerStore((state) => state.updateMemberPresence);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (!channelId || !token) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsConnected(false);
      return;
    }

    let isMounted = true;

    function connect() {
      // Build proper WS URL depending on environment and host
      const rawHost = import.meta.env.VITE_WS_URL || window.location.host;
      const cleanHost = rawHost.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/+$/, '');
      const protocol = window.location.protocol === 'https:' || rawHost.startsWith('https:') || rawHost.startsWith('wss:') ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${cleanHost}/ws/channels/${channelId}/?token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chat_message') {
            addMessage(data.message);
          } else if (data.type === 'typing') {
            setTypingUser(data.user_id, data.username, data.is_typing);
          } else if (data.type === 'presence') {
            updateMemberPresence(data.user_id, data.is_online);
          }
        } catch (err) {
          console.error('Error parsing WS message', err);
        }
      };

      ws.onerror = (error) => {
        console.warn('WebSocket error', error);
      };

      ws.onclose = (event) => {
        if (!isMounted) return;
        setIsConnected(false);
        // Only reconnect if not intentionally closed
        if (event.code !== 1000 && event.code !== 4001 && event.code !== 4003) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) connect();
          }, 3000);
        }
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
    };
  }, [channelId, token, addMessage, setTypingUser, updateMemberPresence]);

  const sendMessage = useCallback((content) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        content,
      }));
    }
  }, []);

  const sendTyping = useCallback((isTyping) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping,
      }));
    }
  }, []);

  return { isConnected, sendMessage, sendTyping };
}
