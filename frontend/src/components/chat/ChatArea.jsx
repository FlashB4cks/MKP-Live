import React, { useState, useEffect, useRef } from 'react';
import { Hash, Users, Send, Smile, Wifi, WifiOff, Menu } from 'lucide-react';
import { useServerStore } from '../../store/serverStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useChatWebSocket } from '../../hooks/useChatWebSocket';
import SessionBanner from '../sessions/SessionBanner';

export default function ChatArea({ onToggleMembers, showMembers, onOpenMobileNav }) {
  const activeChannel = useServerStore((state) => state.activeChannel);
  const activeServer = useServerStore((state) => state.activeServer);
  const token = useAuthStore((state) => state.token);
  const messages = useChatStore((state) => state.messages);
  const loading = useChatStore((state) => state.loading);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const typingUsers = useChatStore((state) => state.typingUsers);

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Hook WebSocket
  const { isConnected, sendMessage, sendTyping } = useChatWebSocket(
    activeChannel?.id,
    token
  );

  // Load message history when channel changes
  useEffect(() => {
    if (activeChannel?.id) {
      fetchMessages(activeChannel.id);
    }
  }, [activeChannel?.id, fetchMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Typing emit
    sendTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(inputText.trim());
    sendTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Format typing text
  const typingNames = Object.values(typingUsers);
  let typingMessage = '';
  if (typingNames.length === 1) {
    typingMessage = `${typingNames[0]} está escribiendo...`;
  } else if (typingNames.length > 1) {
    typingMessage = `${typingNames.slice(0, 2).join(', ')} están escribiendo...`;
  }

  // Format message time
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!activeChannel) {
    return (
      <main className="flex-1 bg-discord-chat flex flex-col items-center justify-center text-discord-text-muted select-none p-4 text-center">
        {onOpenMobileNav && (
          <button
            onClick={onOpenMobileNav}
            className="md:hidden mb-4 px-4 py-2 bg-discord-blurple text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow"
          >
            <Menu className="w-4 h-4" />
            <span>Abrir Canales</span>
          </button>
        )}
        <Hash className="w-16 h-16 mb-4 opacity-40 text-discord-text-muted" />
        <h3 className="text-lg font-semibold text-white">Ningún canal seleccionado</h3>
        <p className="text-sm">Selecciona un canal en la barra lateral para ver los mensajes.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-discord-chat flex flex-col min-w-0 h-full overflow-hidden select-text">
      {/* Channel Header Bar */}
      <header className="h-12 border-b border-black/20 px-3 sm:px-4 flex items-center justify-between flex-shrink-0 shadow-sm select-none">
        <div className="flex items-center space-x-2 min-w-0">
          {/* Mobile Hamburger Menu Button */}
          {onOpenMobileNav && (
            <button
              onClick={onOpenMobileNav}
              className="md:hidden p-1.5 -ml-1 text-discord-text-muted hover:text-white hover:bg-discord-hover rounded-lg transition"
              title="Abrir canales y servidores"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-discord-text-muted flex-shrink-0" />
          <span className="font-bold text-white text-sm truncate max-w-[130px] sm:max-w-xs md:max-w-md">
            {activeChannel.name}
          </span>
          {activeChannel.topic && (
            <>
              <div className="w-[1px] h-4 bg-white/10 mx-2 hidden sm:block" />
              <span className="text-xs text-discord-text-muted truncate hidden sm:inline">
                {activeChannel.topic}
              </span>
            </>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-discord-text-muted">
          {/* WebSocket Connection indicator */}
          <div
            className="flex items-center space-x-1 text-xs"
            title={isConnected ? 'Conectado a WebSockets' : 'Desconectado de WebSockets'}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4 text-discord-green" />
            ) : (
              <WifiOff className="w-4 h-4 text-discord-red" />
            )}
          </div>

          <button
            onClick={onToggleMembers}
            className={`p-1.5 hover:text-white transition rounded ${
              showMembers ? 'text-white' : 'text-discord-text-muted'
            }`}
            title="Lista de miembros"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Virtual Sessions Banner (Active & Scheduled with VPN protection) */}
      <SessionBanner serverId={activeServer?.id} />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Channel Welcome Banner */}
        <div className="mb-6 pt-4">
          <div className="w-16 h-16 rounded-full bg-discord-sidebar flex items-center justify-center mb-3">
            <Hash className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            ¡Te damos la bienvenida a #{activeChannel.name}!
          </h2>
          <p className="text-sm text-discord-text-muted mt-1">
            Este es el comienzo del canal #{activeChannel.name}.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-6 text-sm text-discord-text-muted">
            Cargando mensajes...
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const isSameAuthorSameMinute =
              prevMsg &&
              prevMsg.author?.id === msg.author?.id &&
              new Date(msg.created_at) - new Date(prevMsg.created_at) < 5 * 60 * 1000;

            return (
              <div
                key={msg.id || idx}
                className={`group flex items-start space-x-4 hover:bg-discord-hover/40 -mx-4 px-4 py-1 rounded transition duration-75 ${
                  isSameAuthorSameMinute ? 'mt-0.5' : 'mt-3'
                }`}
              >
                {!isSameAuthorSameMinute ? (
                  <div className="w-10 h-10 rounded-full bg-discord-blurple flex-shrink-0 flex items-center justify-center font-bold text-white text-sm overflow-hidden select-none">
                    {msg.author?.avatar_url ? (
                      <img
                        src={msg.author.avatar_url}
                        alt={msg.author.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      msg.author?.username?.[0]?.toUpperCase() || 'U'
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
                  {!isSameAuthorSameMinute && (
                    <div className="flex items-baseline space-x-2 select-none">
                      <span className="font-semibold text-white text-sm hover:underline cursor-pointer">
                        {msg.author?.username || 'Usuario eliminado'}
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
        {typingMessage && (
          <span className="animate-pulse">{typingMessage}</span>
        )}
      </div>

      {/* Message Input Box */}
      <div className="px-2 sm:px-4 pb-16 md:pb-4 flex-shrink-0 select-none">
        <form
          onSubmit={handleSendMessage}
          className="bg-discord-input rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 flex items-center space-x-2 sm:space-x-3 shadow-inner"
        >
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Enviar mensaje a #${activeChannel.name}`}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-discord-text-muted focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected}
            className="text-discord-text-muted hover:text-white transition disabled:opacity-30"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </main>
  );
}
