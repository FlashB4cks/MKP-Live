import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, Loader2, User } from 'lucide-react';
import api from '../../api/client';
import { useDMStore } from '../../store/dmStore';

export default function StartDMModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const startDirectMessage = useDMStore((state) => state.startDirectMessage);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/chat/users/${searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : ''}`);
        setUsers(res.data);
      } catch (err) {
        console.error('Error searching users', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 250);
    return () => clearTimeout(debounce);
  }, [isOpen, searchTerm]);

  const handleSelectUser = async (targetUserId) => {
    await startDirectMessage(targetUserId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 select-none backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-discord-chat shadow-2xl border border-white/10 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
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
              placeholder="Buscar por nombre de usuario..."
              className="w-full bg-discord-input text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-transparent focus:border-discord-blurple focus:outline-none transition placeholder-discord-text-muted"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-discord-text-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-discord-blurple" />
              <span className="text-xs">Buscando usuarios...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-discord-text-muted text-xs">
              No se encontraron usuarios disponibles.
            </div>
          ) : (
            users.map((targetUser) => (
              <div
                key={targetUser.id}
                onClick={() => handleSelectUser(targetUser.id)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-discord-hover transition cursor-pointer group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-discord-blurple flex items-center justify-center text-sm font-bold text-white">
                      {targetUser.avatar_url ? (
                        <img
                          src={targetUser.avatar_url}
                          alt={targetUser.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        targetUser.username?.[0]?.toUpperCase()
                      )}
                    </div>
                    {targetUser.is_online && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-discord-green rounded-full border-2 border-discord-chat" />
                    )}
                  </div>

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
                    handleSelectUser(targetUser.id);
                  }}
                  className="px-3 py-1.5 rounded-md bg-discord-blurple text-white text-xs font-semibold hover:bg-discord-blurple-hover transition shadow-sm"
                >
                  Mensaje
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
