import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, MessageSquare, Loader2, User, UserPlus, Clock } from 'lucide-react';
import api from '../../api/client';
import { useDMStore } from '../../store/dmStore';
import { useAuthStore } from '../../store/authStore';
import UserAvatar from '../common/UserAvatar';

export default function StartDMModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const startDirectMessage = useDMStore((state) => state.startDirectMessage);
  const selectConversation = useDMStore((state) => state.selectConversation);
  const conversations = useDMStore((state) => state.conversations);
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setUsers([]);
      return;
    }

    const query = searchTerm.trim().replace(/^@/, '');
    if (query.length < 2) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/chat/users/?q=${encodeURIComponent(query)}`);
        setUsers(res.data);
      } catch (err) {
        console.error('Error searching users', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [isOpen, searchTerm]);

  const handleSelectUser = async (targetUser) => {
    // Check if conversation already exists
    const existing = conversations.find((c) =>
      c.participants?.some((p) => String(p.id) === String(targetUser.id)) ||
      String(c.other_user?.id) === String(targetUser.id)
    );

    if (existing) {
      await selectConversation(existing);
      onClose();
      return;
    }

    const res = await startDirectMessage(targetUser.id);
    if (res.success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 select-none backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-discord-chat shadow-2xl border border-white/10 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-black/20 flex items-center justify-between bg-discord-sidebar">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-discord-blurple" />
              <span>Nuevo Mensaje Directo</span>
            </h3>
            <p className="text-xs text-discord-text-muted mt-0.5">
              Busca y selecciona un usuario para iniciar una conversación privada.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-discord-text-muted hover:text-white hover:bg-discord-hover transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/5 bg-discord-chat">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-discord-text-muted absolute left-3 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por @nombre de usuario..."
              className="w-full bg-discord-input text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-transparent focus:border-discord-blurple focus:outline-none transition placeholder-discord-text-muted"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {searchTerm.trim().length < 2 ? (
            <div className="py-10 text-center text-discord-text-muted text-xs space-y-2">
              <Search className="w-8 h-8 text-discord-text-muted/40 mx-auto" />
              <p className="font-medium text-white/80">Escribe el @nombre del usuario</p>
              <p className="text-[11px] text-discord-text-muted/70 max-w-xs mx-auto">
                Para proteger la privacidad, introduce al menos 2 letras para encontrar a la persona.
              </p>
            </div>
          ) : loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-discord-text-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-discord-blurple" />
              <span className="text-xs">Buscando usuarios...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-discord-text-muted text-xs">
              No se encontraron usuarios que coincidan con "@{searchTerm.trim()}".
            </div>
          ) : (
            users.map((targetUser) => {
              const existingConv = conversations.find(
                (c) =>
                  c.participants?.some((p) => String(p.id) === String(targetUser.id)) ||
                  String(c.other_user?.id) === String(targetUser.id)
              );
              const isAccepted = existingConv?.status === 'ACCEPTED';
              const isPending = existingConv?.status === 'PENDING';

              return (
                <div
                  key={targetUser.id}
                  onClick={() => handleSelectUser(targetUser)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-discord-hover transition cursor-pointer group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <UserAvatar user={targetUser} size="sm" showOnline={true} />

                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white group-hover:text-discord-blurple transition block truncate">
                        @{targetUser.username}
                      </span>
                      <span className="text-[10px] text-discord-text-muted truncate block">
                        {targetUser.status_text || (targetUser.is_online ? 'En línea' : 'Desconectado')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectUser(targetUser);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition shadow-sm flex items-center space-x-1.5 ${
                      isAccepted
                        ? 'bg-discord-blurple text-white hover:bg-discord-blurple-hover'
                        : isPending
                        ? 'bg-discord-yellow/20 text-discord-yellow hover:bg-discord-yellow/30'
                        : 'bg-discord-green text-white hover:bg-discord-green/90'
                    }`}
                  >
                    {isAccepted ? (
                      <span>Abrir chat</span>
                    ) : isPending ? (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pendiente</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Enviar solicitud</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
