import { useEffect, useCallback } from 'react';
import { useSocketStore } from '../store/socketStore';

export function useChatWebSocket(channelId, token) {
  const isConnected = useSocketStore((state) => state.isConnected);
  const subscribeChannel = useSocketStore((state) => state.subscribeChannel);
  const sendChatMessage = useSocketStore((state) => state.sendChatMessage);
  const sendTypingSocket = useSocketStore((state) => state.sendTyping);
  const connect = useSocketStore((state) => state.connect);

  useEffect(() => {
    if (token) {
      connect(token);
    }
  }, [token, connect]);

  useEffect(() => {
    if (channelId) {
      subscribeChannel(channelId);
    }
  }, [channelId, subscribeChannel]);

  const sendMessage = useCallback((content) => {
    if (channelId) {
      return sendChatMessage(channelId, content);
    }
    return false;
  }, [channelId, sendChatMessage]);

  const sendTyping = useCallback((isTyping) => {
    if (channelId) {
      sendTypingSocket(isTyping, channelId, null);
    }
  }, [channelId, sendTypingSocket]);

  return { isConnected, sendMessage, sendTyping };
}

