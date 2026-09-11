import React, { useState, useEffect, useRef } from 'react';
import {
  Hash,
  Users,
  Send,
  Wifi,
  WifiOff,
  Menu,
  Search,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useServerStore } from '../../store/serverStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useChatWebSocket } from '../../hooks/useChatWebSocket';
import SessionBanner from '../sessions/SessionBanner';
import VoiceRecorder from './VoiceRecorder';
import MessageAttachment from './MessageAttachment';
import MessageReactions, { ReactionBar } from './MessageReactions';
import ConfirmModal from '../modals/ConfirmModal';
import UserAvatar from '../common/UserAvatar';
import api from '../../api/client';

export default function ChatArea({ onToggleMembers, showMembers, onOpenMobileNav }) {
  const activeChannel = useServerStore((state) => state.activeChannel);
  const activeServer = useServerStore((state) => state.activeServer);
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);
  const messages = useChatStore((state) => state.messages);
  const loading = useChatStore((state) => state.loading);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const updateMessageReactions = useChatStore((state) => state.updateMessageReactions);
  const deleteMessage = useChatStore((state) => state.deleteMessage);

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  const myPerms = activeServer?.my_permissions || {};
  const isOwner = activeServer?.owner?.id === currentUser?.id;
  const canManageMessages =
    isOwner ||
    myPerms.is_admin_or_owner ||
    myPerms.can_manage_messages ||
    myPerms.role === 'ADMIN' ||
    myPerms.role === 'OWNER';

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
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  }, [activeChannel?.id, fetchMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, searchQuery]);

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

  // Toggle emoji reaction
  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const res = await api.post(`/chat/messages/${messageId}/reaction/`, {
        emoji,
        is_dm: false,
      });
      if (res.data?.reactions) {
        updateMessageReactions(messageId, res.data.reactions);
      }
    } catch (err) {
      console.error('Error al reaccionar', err);
    }
  };

  // Voice note upload
  const handleSendVoiceNote = async (audioBlob, mimeType) => {
    if (!audioBlob || !activeChannel?.id) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      formData.append('file', audioBlob, `audio_nota_${Date.now()}.${ext}`);
      formData.append('channel_id', activeChannel.id);

      await api.post('/chat/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      console.error('Error al enviar nota de voz', err);
    } finally {
      setIsUploading(false);
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

  // Filter messages by search term
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) =>
        (m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.attachment_name && m.attachment_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.author?.username && m.author.username.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : messages;

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
        <div className="flex items-center space-x-2 min-w-0 flex-1">
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
        <div className="flex items-center space-x-2 sm:space-x-3 text-discord-text-muted flex-shrink-0">
          {/* Channel Message Search Bar */}
          <div className="relative flex items-center">
            {isSearchOpen ? (
              <div className="flex items-center bg-discord-input rounded-md px-2 py-1 space-x-1 border border-white/10 animate-in fade-in">
                <Search className="w-3.5 h-3.5 text-discord-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en el canal..."
                  autoFocus
                  className="bg-transparent text-xs text-white placeholder:text-discord-text-muted focus:outline-none w-28 sm:w-44"
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
                title="Buscar mensajes en este canal"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

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

      {/* Search results notification banner */}
      {searchQuery.trim() && (
        <div className="px-4 py-1.5 bg-discord-sidebar/90 border-b border-white/10 text-xs text-discord-text-muted flex justify-between items-center select-none">
          <span>
            Mostrando resultados para &ldquo;<strong className="text-white">{searchQuery}</strong>&rdquo; ({filteredMessages.length} mensaje{filteredMessages.length !== 1 ? 's' : ''})
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
        {/* Channel Welcome Banner */}
        {!searchQuery && (
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
        )}

        {loading ? (
          <div className="text-center py-6 text-sm text-discord-text-muted">
            Cargando mensajes...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-sm text-discord-text-muted">
            {searchQuery ? 'No se encontraron mensajes que coincidan.' : 'No hay mensajes aún.'}
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
            const isSameAuthorSameMinute =
              prevMsg &&
              prevMsg.author?.id === msg.author?.id &&
              new Date(msg.created_at) - new Date(prevMsg.created_at) < 5 * 60 * 1000;
            const canDeleteThisMessage =
              msg.author?.id === currentUser?.id || canManageMessages;

            return (
              <div
                key={msg.id || idx}
                className={`relative group flex items-start space-x-4 hover:bg-discord-hover/40 -mx-4 px-4 py-1.5 rounded transition duration-75 ${
                  isSameAuthorSameMinute ? 'mt-0.5' : 'mt-3'
                }`}
              >
                {/* Floating Quick Action Bar on Hover */}
                <div className="absolute right-4 -top-3.5 z-10 hidden group-hover:flex items-center space-x-0.5 bg-discord-sidebar/95 border border-white/10 rounded-lg p-0.5 shadow-lg backdrop-blur-sm">
                  <ReactionBar onSelectEmoji={(emoji) => handleToggleReaction(msg.id, emoji)} />
                  {canDeleteThisMessage && (
                    <button
                      type="button"
                      onClick={() => setMessageToDelete(msg)}
                      className="p-1.5 hover:text-discord-red text-discord-text-muted hover:bg-white/10 rounded transition"
                      title="Eliminar mensaje"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {!isSameAuthorSameMinute ? (
                  <UserAvatar user={msg.author} size="md" />
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

                  {msg.content && (
                    <p className="text-discord-text text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                  )}

                  {/* Attachment rendering (images, voice notes, files) */}
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

          {/* Voice Recorder button & controls */}
          <VoiceRecorder
            onSendAudio={handleSendVoiceNote}
            disabled={!isConnected || isUploading}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected}
            className="text-discord-text-muted hover:text-white transition disabled:opacity-30 p-1"
            title="Enviar mensaje"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      <ConfirmModal
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={async () => {
          if (messageToDelete) {
            await deleteMessage(messageToDelete.id);
            setMessageToDelete(null);
          }
        }}
        title="Eliminar mensaje"
        message="¿Estás seguro de que deseas eliminar este mensaje? Esta acción no se puede deshacer."
        confirmText="Eliminar Mensaje"
        danger={true}
      />
    </main>
  );
}
