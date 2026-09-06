import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Wifi, WifiOff, Plus, User, Clock, Check, CheckCheck } from 'lucide-react';
import { useDMStore } from '../../store/dmStore';
import { useAuthStore } from '../../store/authStore';
import { useDMWebSocket } from '../../hooks/useDMWebSocket';
import StartDMModal from '../modals/StartDMModal';

export default function DirectMessageArea() {
  const activeConversation = useDMStore((state) => state.activeConversation);
  const conversations = useDMStore((state) => state.conversations);
  const messages = useDMStore((state) => state.messages);
  const loading = useDMStore((state) => state.loading);
  const typingUser = useDMStore((state) => state.typingUser);
  const selectConversation = useDMStore((state) => state.selectConversation);
  const sendDirectMessage = useDMStore((state) => state.sendDirectMessage);
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);

  const [inputText, setInputText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Hook WebSocket for real-time messages & typing in current DM conversation
  const { isConnected, sendMessage, sendTyping } = useDMWebSocket(
    activeConversation?.id,
    token
  );

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Determine the other participant in this DM
  const otherUser = activeConversation?.other_user ||
    activeConversation?.participants?.find((p) => p.id !== currentUser?.id) || {
      username: 'Usuario',
      is_online: false,
    };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Emit typing event to peer
    sendTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    sendTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isConnected) {
      sendMessage(text);
    } else {
      await sendDirectMessage(text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // If no conversation is selected, render the DM Home View
  if (!activeConversation) {
    return (
      <main className="flex-1 bg-discord-chat flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-discord-blurple/20 border border-discord-blurple/30 flex items-center justify-center mb-5 text-discord-blurple shadow-xl">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Mensajes Directos en MKP Live
        </h2>
        <p className="text-sm text-discord-text-muted max-w-md mb-6 leading-relaxed">
          Comunícate en privado y en tiempo real con cualquier usuario registrado. Busca a un compañero o continúa una conversación pendiente.
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-discord-blurple hover:bg-discord-blurple-hover text-white rounded-xl font-semibold text-sm transition shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Iniciar nuevo mensaje directo</span>
        </button>

        {/* Recent DM list preview */}
        {conversations.length > 0 && (
          <div className="mt-10 w-full max-w-md text-left">
            <h4 className="text-xs font-bold text-discord-text-muted uppercase tracking-wider mb-3 px-1">
              Conversaciones recientes
            </h4>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {conversations.map((conv) => {
                const partner = conv.other_user || conv.participants?.find((p) => p.id !== currentUser?.id);
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className="flex items-center justify-between p-3 rounded-xl bg-discord-sidebar/60 hover:bg-discord-hover transition cursor-pointer border border-white/5 group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-discord-blurple flex items-center justify-center text-xs font-bold text-white">
                          {partner?.avatar_url ? (
                            <img
                              src={partner.avatar_url}
                              alt={partner.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            partner?.username?.[0]?.toUpperCase() || 'U'
                          )}
                        </div>
                        {partner?.is_online && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-discord-green rounded-full border-2 border-discord-sidebar" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white group-hover:text-discord-blurple transition block truncate">
                          @{partner?.username || 'Usuario'}
                        </span>
                        <span className="text-[11px] text-discord-text-muted truncate block">
                          {conv.last_message?.content || 'Sin mensajes aún'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-discord-text-muted whitespace-nowrap">
                      {conv.last_message?.created_at ? formatTime(conv.last_message.created_at) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <StartDMModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-discord-chat flex flex-col min-w-0 h-full overflow-hidden select-text">
      {/* Header Bar */}
      <header className="h-12 border-b border-black/20 px-4 flex items-center justify-between flex-shrink-0 shadow-sm select-none">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-xs font-bold text-white overflow-hidden">
              {otherUser.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                otherUser.username?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-discord-chat ${
                otherUser.is_online ? 'bg-discord-green' : 'bg-discord-text-muted'
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm truncate">
                @{otherUser.username}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-discord-text-muted">
                Mensaje Directo
              </span>
            </div>
            {otherUser.status_text && (
              <span className="text-[10px] text-discord-text-muted truncate block">
                {otherUser.status_text}
              </span>
            )}
          </div>
        </div>

        {/* Right side connection indicator */}
        <div className="flex items-center space-x-3 text-discord-text-muted">
          <div
            className="flex items-center space-x-1 text-xs"
            title={isConnected ? 'Conectado a WebSockets (MD en tiempo real)' : 'Conectando / Modo HTTP'}
          >
            {isConnected ? (
              <span className="flex items-center gap-1 text-[11px] text-discord-green">
                <Wifi className="w-4 h-4" />
                <span className="hidden sm:inline">En vivo</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-discord-yellow">
                <WifiOff className="w-4 h-4" />
                <span className="hidden sm:inline">Conectando...</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome Header */}
        <div className="mb-6 pt-4 select-none">
          <div className="w-20 h-20 rounded-full bg-discord-blurple flex items-center justify-center mb-3 text-white text-2xl font-bold overflow-hidden shadow-lg">
            {otherUser.avatar_url ? (
              <img
                src={otherUser.avatar_url}
                alt={otherUser.username}
                className="w-full h-full object-cover"
              />
            ) : (
              otherUser.username?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            @{otherUser.username}
          </h2>
          <p className="text-sm text-discord-text-muted mt-1">
            Este es el comienzo de tu historial de mensajes directos con{' '}
            <strong className="text-discord-text">@{otherUser.username}</strong>.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-6 text-sm text-discord-text-muted">
            Cargando historial de mensajes...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-xs text-discord-text-muted select-none">
            Aún no hay mensajes en esta conversación. ¡Envía el primero abajo!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender?.id === currentUser?.id;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const isSameSenderSameMinute =
              prevMsg &&
              prevMsg.sender?.id === msg.sender?.id &&
              new Date(msg.created_at) - new Date(prevMsg.created_at) < 5 * 60 * 1000;

            return (
              <div
                key={msg.id || idx}
                className={`group flex items-start space-x-4 hover:bg-discord-hover/40 -mx-4 px-4 py-1 rounded transition duration-75 ${
                  isSameSenderSameMinute ? 'mt-0.5' : 'mt-3'
                }`}
              >
                {!isSameSenderSameMinute ? (
                  <div className="w-10 h-10 rounded-full bg-discord-blurple flex-shrink-0 flex items-center justify-center font-bold text-white text-sm overflow-hidden select-none">
                    {msg.sender?.avatar_url ? (
                      <img
                        src={msg.sender.avatar_url}
                        alt={msg.sender.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      msg.sender?.username?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                ) : (
                  <div className="w-10 flex-shrink-0 text-right pr-1 select-none">
                    <span className="text-[10px] text-discord-text-muted opacity-0 group-hover:opacity-100 transition">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {!isSameSenderSameMinute && (
                    <div className="flex items-baseline space-x-2 select-none">
                      <span className={`font-semibold text-sm ${isMe ? 'text-discord-blurple' : 'text-white'}`}>
                        {isMe ? 'Tú' : `@${msg.sender?.username || 'Usuario'}`}
                      </span>
                      <span className="text-[10px] text-discord-text-muted">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <p className="text-discord-text text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      <div className="h-5 px-4 text-xs text-discord-text-muted flex items-center select-none">
        {typingUser && (
          <span className="animate-pulse">
            @{typingUser} está escribiendo...
          </span>
        )}
      </div>

      {/* Message Input Box */}
      <div className="px-4 pb-4 flex-shrink-0 select-none">
        <form
          onSubmit={handleSendMessage}
          className="bg-discord-input rounded-lg px-4 py-2.5 flex items-center space-x-3 shadow-inner"
        >
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Enviar mensaje a @${otherUser.username}`}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-discord-text-muted focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="text-discord-text-muted hover:text-white transition disabled:opacity-30"
            title="Enviar mensaje"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      <StartDMModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}
