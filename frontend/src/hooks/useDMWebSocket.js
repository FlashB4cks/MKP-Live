import { useEffect, useCallback } from 'react';
import { useSocketStore } from '../store/socketStore';

export function useDMWebSocket(conversationId, token) {
  const isConnected = useSocketStore((state) => state.isConnected);
  const subscribeDM = useSocketStore((state) => state.subscribeDM);
  const sendDMMessage = useSocketStore((state) => state.sendDMMessage);
  const sendTypingSocket = useSocketStore((state) => state.sendTyping);
  const connect = useSocketStore((state) => state.connect);

  useEffect(() => {
    if (token) {
      connect(token);
    }
  }, [token, connect]);

  useEffect(() => {
    if (conversationId) {
      subscribeDM(conversationId);
    }
  }, [conversationId, subscribeDM]);

  const sendMessage = useCallback((content) => {
    if (conversationId) {
      return sendDMMessage(conversationId, content);
    }
    return false;
  }, [conversationId, sendDMMessage]);

  const sendTyping = useCallback((isTyping) => {
    if (conversationId) {
      sendTypingSocket(isTyping, null, conversationId);
    }
  }, [conversationId, sendTypingSocket]);

  return { isConnected, sendMessage, sendTyping };
}

