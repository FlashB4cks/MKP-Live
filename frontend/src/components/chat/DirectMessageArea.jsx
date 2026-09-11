import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
  Plus,
  Menu,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import { useDMStore } from '../../store/dmStore';
import { useAuthStore } from '../../store/authStore';
import { useDMWebSocket } from '../../hooks/useDMWebSocket';
import StartDMModal from '../modals/StartDMModal';
import VoiceRecorder from './VoiceRecorder';
import MessageAttachment from './MessageAttachment';
import MessageReactions, { ReactionBar } from './MessageReactions';
import api from '../../api/client';

export default function DirectMessageArea({ onOpenMobileNav }) {
  const activeConversation = useDMStore((state) => state.activeConversation);
  const conversations = useDMStore((state) => state.conversations);
  const messages = useDMStore((state) => state.messages);
  const loading = useDMStore((state) => state.loading);
  const typingUser = useDMStore((state) => state.typingUser);
  const selectConversation = useDMStore((state) => state.selectConversation);
  const sendDirectMessage = useDMStore((state) => state.sendDirectMessage);
  const updateMessageReactions = useDMStore((state) => state.updateMessageReactions);
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Hook WebSocket for real-time messages & typing in current DM conversation
  const { isConnected, sendMessage, sendTyping } = useDMWebSocket(
    activeConversation?.id,
    token
  );

  // Reset search when active conversation changes
  useEffect(() => {
    setSearchQuery('');
    setIsSearchOpen(false);
  }, [activeConversation?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, searchQuery]);

  // Determine the other participant in this DM
  const otherUser =
    activeConversation?.other_user ||
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

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const res = await api.post(`/chat/messages/${messageId}/reaction/`, {
        emoji,
        is_dm: true,
      });
      if (res.data?.reactions) {
        updateMessageReactions(messageId, res.data.reactions);
      }
    } catch (err) {
      console.error('Error al reaccionar en DM', err);
    }
  };

  const handleSendVoiceNote = async (audioBlob, mimeType) => {
    if (!audioBlob || !activeConversation?.id) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      formData.append('file', audioBlob, `dm_audio_${Date.now()}.${ext}`);
      formData.append('conversation_id', activeConversation.id);

      await api.post('/chat/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      console.error('Error al enviar nota de voz en DM', err);
    } finally {
      setIsUploading(false);
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

  const filteredMessages = searchQuery.trim()
    ? messages.filter(
        (m) =>
          (m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (m.attachment_name && m.attachment_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : messages;

  // If no conversation is selected, render the DM Home View
  if (!activeConversation) {
    return (
      <main className="flex-1 bg-discord-chat flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
        {onOpenMobileNav && (
          <button
            onClick={onOpenMobileNav}
            className="md:hidden mb-4 px-4 py-2 bg-discord-blurple text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow"
          >
            <Menu className="w-4 h-4" />
            <span>Ver chats y servidores</span>
          </button>
        )}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-discord-blurple/20 border border-discord-blurple/30 flex items-center justify-center mb-4 sm:mb-5 text-discord-blurple shadow-xl">
          <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Mensajes Directos en MKP Live
        </h2>
        <p className="text-xs sm:text-sm text-discord-text-muted max-w-md mb-6 leading-relaxed">
          Comunícate en privado y en tiempo real con cualquier usuario registrado. Busca a un compañero o continúa una conversación pendiente.
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 sm:px-5 py-2 sm:py-2.5 bg-discord-blurple hover:bg-discord-blurple-hover text-white rounded-xl font-semibold text-xs sm:text-sm transition shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Iniciar nuevo mensaje directo</span>
        </button>

        {/* Recent DM list preview */}
        {conversations.length > 0 && (
          <div className="mt-8 sm:mt-10 w-full max-w-md text-left">
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
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-discord-sidebar/60 hover:bg-discord-hover transition cursor-pointer border border-white/5 group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-discord-blurple flex items-center justify-center text-xs font-bold text-white">
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
                        <span className="text-xs font-semibold text-white group-hover:text-discord-blurple transition block truncate max-w-[140px] sm:max-w-xs">
                          @{partner?.username || 'Usuario'}
                        </span>
                        <span className="text-[11px] text-discord-text-muted truncate block max-w-[140px] sm:max-w-xs">
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
      <header className="h-12 border-b border-black/20 px-3 sm:px-4 flex items-center justify-between flex-shrink-0 shadow-sm select-none">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          {/* Mobile Hamburger Menu Button */}
          {onOpenMobileNav && (
            <button
              onClick={onOpenMobileNav}
              className="md:hidden p-1.5 -ml-1 text-discord-text-muted hover:text-white hover:bg-discord-hover rounded-lg transition mr-1"
              title="Abrir mensajes y servidores"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="relative flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-discord-blurple flex items-center justify-center text-xs font-bold text-white overflow-hidden">
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
              <span className="font-bold text-white text-sm truncate max-w-[120px] sm:max-w-xs">
                @{otherUser.username}
              </span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-discord-text-muted hidden xs:inline">
                Mensaje Directo
              </span>
            </div>
            {otherUser.status_text && (
              <span className="text-[10px] text-discord-text-muted truncate block max-w-[120px] sm:max-w-xs">
                {otherUser.status_text}
              </span>
            )}
          </div>
        </div>

        {/* Right side controls (Search & Connection status) */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-discord-text-muted flex-shrink-0">
          {/* DM Search input */}
          <div className="relative flex items-center">
            {isSearchOpen ? (
              <div className="flex items-center bg-discord-input rounded-md px-2 py-1 space-x-1 border border-white/10 animate-in fade-in">
                <Search className="w-3.5 h-3.5 text-discord-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en el chat..."
                  autoFocus
                  className="bg-transparent text-xs text-white placeholder:text-discord-text-muted focus:outline-none w-28 sm:w-40"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="text-discord-text-muted hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="p-1.5 hover:text-white transition rounded hover:bg-white/5"
                title="Buscar en esta conversación"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

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

      {/* Search results banner */}
      {searchQuery.trim() && (
        <div className="px-4 py-1.5 bg-discord-sidebar/90 border-b border-white/10 text-xs text-discord-text-muted flex justify-between items-center select-none">
          <span>
            Mostrando resultados para &ldquo;<strong className="text-white">{searchQuery}</strong>&rdquo; ({filteredMessages.length})
          </span>
          <button
            onClick={() => setSearchQuery('')}
            className="text-discord-blurple hover:underline font-semibold"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome Header */}
        {!searchQuery && (
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
        )}

        {loading ? (
          <div className="text-center py-6 text-sm text-discord-text-muted">
            Cargando historial de mensajes...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-8 text-center text-xs text-discord-text-muted select-none">
            {searchQuery
              ? 'No se encontraron mensajes que coincidan.'
              : 'Aún no hay mensajes en esta conversación. ¡Envía el primero abajo!'}
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const isMe = msg.sender?.id === currentUser?.id;
            const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
            const isSameSenderSameMinute =
              prevMsg &&
              prevMsg.sender?.id === msg.sender?.id &&
              new Date(msg.created_at) - new Date(prevMsg.created_at) < 5 * 60 * 1000;

            return (
              <div
                key={msg.id || idx}
                className={`relative group flex items-start space-x-4 hover:bg-discord-hover/40 -mx-4 px-4 py-1.5 rounded transition duration-75 ${
                  isSameSenderSameMinute ? 'mt-0.5' : 'mt-3'
                }`}
              >
                {/* Floating Emoji Reaction Bar on Hover */}
                <div className="absolute right-4 -top-3 z-10 hidden group-hover:flex items-center">
                  <ReactionBar onSelectEmoji={(emoji) => handleToggleReaction(msg.id, emoji)} />
                </div>

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

                  {msg.content && (
                    <p className="text-discord-text text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                  )}

                  {/* Attachment rendering */}
                  {msg.attachment && (
                    <MessageAttachment
                      attachment={msg.attachment}
                      attachmentType={msg.attachment_type}
                      attachmentName={msg.attachment_name}
                    />
                  )}

                  {/* Interactive Emoji Reaction Badges */}
                  <MessageReactions
                    reactions={msg.reactions}
                    currentUserId={currentUser?.id}
                    onToggleReaction={(emoji) => handleToggleReaction(msg.id, emoji)}
                  />
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
            placeholder={`Enviar mensaje a @${otherUser.username}`}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-discord-text-muted focus:outline-none"
          />

          {/* Voice Recorder button & controls */}
          <VoiceRecorder
            onSendAudio={handleSendVoiceNote}
            disabled={isUploading}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="text-discord-text-muted hover:text-white transition disabled:opacity-30 p-1"
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
