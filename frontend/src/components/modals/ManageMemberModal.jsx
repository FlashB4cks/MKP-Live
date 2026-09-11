import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, Check, Trash2, UserMinus } from 'lucide-react';
import { useServerStore } from '../../store/serverStore';

export default function ManageMemberModal({ isOpen, onClose, member, serverId, isOwner }) {
  const updateMemberPermissions = useServerStore((state) => state.updateMemberPermissions);
  const kickMember = useServerStore((state) => state.kickMember);

  const [role, setRole] = useState('MEMBER');
  const [canManageMessages, setCanManageMessages] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member) {
      setRole(member.role || 'MEMBER');
      setCanManageMessages(!!member.can_manage_messages);
      setCanManageMembers(!!member.can_manage_members);
      setError('');
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      role,
      can_manage_messages: canManageMessages,
      can_manage_members: canManageMembers,
    };

    const res = await updateMemberPermissions(serverId, member.id, payload);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error);
    }
  };

  const handleKick = async () => {
    if (!window.confirm(`¿Estás seguro de que deseas expulsar a @${member.user.username}?`)) {
      return;
    }
    setLoading(true);
    const res = await kickMember(serverId, member.id);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error);
    }
  };

  const isTargetOwner = member.role === 'OWNER';

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 select-none backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-discord-chat shadow-2xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-black/20 flex items-center justify-between bg-discord-sidebar">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-discord-blurple/20 text-discord-blurple">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Permisos de @{member.user.username}
              </h3>
              <p className="text-xs text-discord-text-muted">
                Configura el rol y los permisos granulares del miembro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-discord-text-muted hover:text-white transition hover:bg-discord-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-2.5 rounded bg-discord-red/20 border border-discord-red/40 text-discord-red text-xs">
            {error}
          </div>
        )}

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          {/* Member preview card */}
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-discord-sidebar/60 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center font-bold text-white text-sm overflow-hidden">
              {member.user.avatar_url ? (
                <img
                  src={member.user.avatar_url}
                  alt={member.user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                member.user.username?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div>
              <span className="font-semibold text-white text-sm block">
                {member.nickname || member.user.username}
              </span>
              <span className="text-[11px] text-discord-text-muted">
                Rol actual: {member.role}
              </span>
            </div>
          </div>

          {/* Role selector (only if not owner) */}
          {!isTargetOwner ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                Rol en el servidor
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading || !isOwner}
                className="w-full bg-discord-input text-white text-xs px-3 py-2 rounded-lg border border-white/10 focus:border-discord-blurple focus:outline-none transition disabled:opacity-60"
              >
                <option value="MEMBER">Miembro (Standard)</option>
                <option value="ADMIN">Administrador (ADMIN)</option>
              </select>
              {!isOwner && (
                <span className="text-[10px] text-discord-text-muted mt-1 block">
                  Solo el dueño del servidor puede cambiar el rol a Administrador.
                </span>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded bg-discord-yellow/10 border border-discord-yellow/30 text-discord-yellow text-xs">
              Este miembro es el Dueño del Servidor. Sus permisos no pueden modificarse.
            </div>
          )}

          {/* Granular permissions checkboxes */}
          {!isTargetOwner && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted">
                Permisos específicos
              </label>

              <label className="flex items-start space-x-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={canManageMessages || role === 'ADMIN'}
                  disabled={role === 'ADMIN' || loading}
                  onChange={(e) => setCanManageMessages(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-discord-input text-discord-blurple focus:ring-0"
                />
                <div>
                  <span className="text-xs font-semibold text-white group-hover:text-discord-blurple transition block">
                    Gestionar Mensajes (MANAGE_MESSAGES)
                  </span>
                  <span className="text-[11px] text-discord-text-muted block">
                    Permite eliminar mensajes de cualquier usuario en todos los canales de este servidor.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={canManageMembers || role === 'ADMIN'}
                  disabled={role === 'ADMIN' || loading}
                  onChange={(e) => setCanManageMembers(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-discord-input text-discord-blurple focus:ring-0"
                />
                <div>
                  <span className="text-xs font-semibold text-white group-hover:text-discord-blurple transition block">
                    Gestionar Miembros (MANAGE_MEMBERS)
                  </span>
                  <span className="text-[11px] text-discord-text-muted block">
                    Permite expulsar miembros del servidor.
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            {!isTargetOwner && (
              <button
                type="button"
                onClick={handleKick}
                disabled={loading}
                className="flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-semibold text-discord-red hover:bg-discord-red/20 transition"
                title="Expulsar del servidor"
              >
                <UserMinus className="w-4 h-4" />
                <span>Expulsar</span>
              </button>
            )}

            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-discord-text-muted hover:text-white hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              {!isTargetOwner && (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-discord-blurple hover:bg-discord-blurple-hover transition shadow flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
