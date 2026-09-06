import { useEffect, useRef, useState, useCallback } from 'react';
import { useDMStore } from '../store/dmStore';

export function useDMWebSocket(conversationId, token) {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const addMessage = useDMStore((state) => state.addMessage);
  const setTypingUser = useDMStore((state) => state.setTypingUser);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (!conversationId || !token) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsConnected(false);
      return;
    }

    let isMounted = true;

    function connect() {
      const rawHost = import.meta.env.VITE_WS_URL || window.location.host;
      const cleanHost = rawHost.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/+$/, '');
      const protocol = window.location.protocol === 'https:' || rawHost.startsWith('https:') || rawHost.startsWith('wss:') ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${cleanHost}/ws/dms/${conversationId}/?token=${token}`;

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
            setTypingUser(data.username, data.is_typing);
          }
        } catch (err) {
          console.error('Error parsing DM WS message', err);
        }
      };

      ws.onerror = (error) => {
        console.warn('DM WebSocket error', error);
      };

      ws.onclose = (event) => {
        if (!isMounted) return;
        setIsConnected(false);
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
  }, [conversationId, token, addMessage, setTypingUser]);

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
