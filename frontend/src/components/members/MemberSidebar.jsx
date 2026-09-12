import React, { useState } from 'react';
import {
  Crown,
  Shield,
  MessageSquare,
  X,
  Users,
  Settings,
  UserMinus,
  Search,
  Mail,
  UserCheck,
} from 'lucide-react';
import { useServerStore } from '../../store/serverStore';
import { useAuthStore } from '../../store/authStore';
import { useDMStore } from '../../store/dmStore';
import ManageMemberModal from '../modals/ManageMemberModal';
import ConfirmModal from '../modals/ConfirmModal';
import UserAvatar from '../common/UserAvatar';

export default function MemberSidebar({ isVisible, isOpenMobile, onCloseMobile }) {
  const members = useServerStore((state) => state.members);
  const activeServer = useServerStore((state) => state.activeServer);
  const kickMember = useServerStore((state) => state.kickMember);
  const setDMView = useServerStore((state) => state.setDMView);
  const currentUser = useAuthStore((state) => state.user);
  const startDirectMessage = useDMStore((state) => state.startDirectMessage);

  const [selectedMemberForManage, setSelectedMemberForManage] = useState(null);
  const [selectedMemberForKick, setSelectedMemberForKick] = useState(null);
  const [kickLoading, setKickLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // If not visible on desktop and not open on mobile, don't render
  if (!isVisible && !isOpenMobile) return null;

  const myPerms = activeServer?.my_permissions || {};
  const isServerOwner = activeServer?.owner?.id === currentUser?.id;
  const canManageMembers =
    isServerOwner ||
    myPerms.is_admin_or_owner ||
    myPerms.can_manage_members ||
    myPerms.role === 'ADMIN' ||
    myPerms.role === 'OWNER';
  const canManageRoles = isServerOwner || myPerms.is_admin_or_owner || myPerms.role === 'ADMIN';

  // Filter members by search query
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().replace(/^@/, '');
    const uname = m.user?.username?.toLowerCase() || '';
    const nick = m.nickname?.toLowerCase() || '';
    const email = m.user?.email?.toLowerCase() || '';
    return uname.includes(q) || nick.includes(q) || email.includes(q);
  });

  const onlineMembers = filteredMembers.filter((m) => m.user.is_online);
  const offlineMembers = filteredMembers.filter((m) => !m.user.is_online);

  const handleStartDM = async (memberUser) => {
    if (memberUser.id === currentUser?.id) return;
    await startDirectMessage(memberUser.id);
    setDMView();
    onCloseMobile?.();
  };

  // 1. Mobile Card Layout (Vertical / Compact Grid with accessible 44px buttons)
  const renderMobileCard = (member) => {
    const isOwner = member.role === 'OWNER';
    const isAdmin = member.role === 'ADMIN';
    const isMe = member.user.id === currentUser?.id;

    return (
      <div
        key={`mobile-${member.id}`}
        className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-2.5 transition select-none"
      >
        {/* User Card Top Row: Avatar & Details */}
        <div className="flex items-start space-x-3 min-w-0">
          <UserAvatar
            user={member.user}
            size="md"
            showOnline={true}
            className="flex-shrink-0 mt-0.5 shadow-sm"
          />

          <div className="min-w-0 flex-1 space-y-1">
            {/* Nombre & Role Tag */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-white truncate block">
                {member.nickname || member.user.username}
              </span>
              {isMe && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-discord-text-muted font-semibold">
                  Tú
                </span>
              )}
            </div>

            {/* Username */}
            <div className="text-[11px] text-discord-text-muted truncate">
              @{member.user.username}
            </div>

            {/* Correo */}
            {member.user.email && (
              <div className="text-[10px] text-discord-text-muted/80 truncate break-all">
                {member.user.email}
              </div>
            )}

            {/* Custom Status */}
            {member.user.status_text && (
              <div className="text-[10px] text-discord-green/90 italic truncate">
                "{member.user.status_text}"
              </div>
            )}

            {/* Compact Grid: Rol y Estado Badges */}
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              {/* Rol Badge */}
              {isOwner ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-discord-yellow/20 text-discord-yellow border border-discord-yellow/30 px-2 py-0.5 rounded-lg font-bold">
                  <Crown className="w-3 h-3" /> Dueño
                </span>
              ) : isAdmin ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30 px-2 py-0.5 rounded-lg font-bold">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              ) : (
                <span className="text-[10px] bg-white/5 text-discord-text-muted border border-white/5 px-2 py-0.5 rounded-lg font-medium">
                  Miembro
                </span>
              )}

              {/* Estado Badge */}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-lg font-medium flex items-center gap-1.5 ${
                  member.user.is_online
                    ? 'bg-discord-green/20 text-discord-green border border-discord-green/30'
                    : 'bg-white/5 text-discord-text-muted border border-white/5'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    member.user.is_online ? 'bg-discord-green animate-pulse' : 'bg-gray-500'
                  }`}
                />
                {member.user.is_online ? 'En línea' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons with 44px Accessible Touch Targets */}
        {!isMe && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            {/* Mensaje Button */}
            <button
              type="button"
              onClick={() => handleStartDM(member.user)}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-discord-blurple/20 hover:bg-discord-blurple text-discord-blurple hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 border border-discord-blurple/30"
              title={`Enviar mensaje directo a @${member.user.username}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Mensaje</span>
            </button>

            {/* Permisos Button */}
            {canManageRoles && !isOwner && (
              <button
                type="button"
                onClick={() => setSelectedMemberForManage(member)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-discord-text hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 border border-white/10"
                title="Gestionar permisos"
              >
                <Settings className="w-4 h-4 text-discord-text-muted" />
                <span className="hidden xs:inline">Permisos</span>
              </button>
            )}

            {/* Expulsar Button */}
            {canManageMembers && !isOwner && (
              <button
                type="button"
                onClick={() => setSelectedMemberForKick(member)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-discord-red/15 hover:bg-discord-red text-discord-red hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 border border-discord-red/20"
                title="Expulsar miembro"
              >
                <UserMinus className="w-4 h-4" />
                <span className="hidden xs:inline">Expulsar</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // 2. Desktop Row Layout (Compact Discord Style)
  const renderDesktopRow = (member) => {
    const isOwner = member.role === 'OWNER';
    const isAdmin = member.role === 'ADMIN';
    const isMe = member.user.id === currentUser?.id;

    return (
      <div
        key={`desktop-${member.id}`}
        onClick={() => !isMe && handleStartDM(member.user)}
        className="group flex items-center px-2 py-1.5 rounded hover:bg-discord-hover transition cursor-pointer select-none"
        title={!isMe ? `Enviar mensaje directo a @${member.user.username}` : undefined}
      >
        <UserAvatar user={member.user} size="sm" showOnline={true} className="mr-3" />

        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="truncate">
            <span
              className={`text-sm font-medium truncate block ${
                member.user.is_online
                  ? 'text-discord-text group-hover:text-white'
                  : 'text-discord-text-muted'
              }`}
            >
              {member.nickname || member.user.username}
            </span>
            {member.user.status_text && (
              <span className="text-[10px] text-discord-text-muted truncate block">
                {member.user.status_text}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
            {!isMe && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartDM(member.user);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-discord-text-muted hover:text-white hover:bg-discord-active rounded transition"
                title={`Enviar mensaje a @${member.user.username}`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-discord-blurple" />
              </button>
            )}

            {!isMe && !isOwner && canManageRoles && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMemberForManage(member);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-discord-text-muted hover:text-white hover:bg-discord-active rounded transition"
                title={`Permisos de @${member.user.username}`}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}

            {!isMe && !isOwner && canManageMembers && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMemberForKick(member);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-discord-text-muted hover:text-discord-red hover:bg-discord-active rounded transition"
                title={`Expulsar a @${member.user.username}`}
              >
                <UserMinus className="w-3.5 h-3.5" />
              </button>
            )}

            {isOwner && (
              <Crown
                className="w-4 h-4 text-discord-yellow flex-shrink-0"
                title="Dueño del servidor"
              />
            )}
            {isAdmin && (
              <Shield
                className="w-4 h-4 text-discord-blurple flex-shrink-0"
                title="Administrador"
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Member Sidebar / Drawer */}
      <aside
        className={`fixed lg:static inset-y-0 right-0 z-50 lg:z-auto w-[88vw] max-w-[340px] sm:w-80 lg:w-60 flex-shrink-0 bg-discord-sidebar lg:bg-discord-channels flex flex-col h-full select-none border-l border-white/10 lg:border-black/10 shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } ${!isVisible ? 'lg:hidden' : 'lg:flex'}`}
      >
        {/* Mobile Header with Title and Touch-accessible 44px close button */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between lg:hidden flex-shrink-0 bg-discord-sidebar">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-discord-blurple/20 text-discord-blurple flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-white block leading-tight">
                Gestión de Miembros
              </span>
              <span className="text-[10px] text-discord-text-muted">
                {activeServer ? activeServer.name : 'Servidor'} ({members.length})
              </span>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-discord-text-muted hover:text-white hover:bg-white/10 transition active:scale-95"
              title="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Member Search Bar (Mobile & Desktop) */}
        <div className="p-3 border-b border-white/5 flex-shrink-0">
          <div className="relative flex items-center bg-discord-chat rounded-xl px-2.5 py-1.5 border border-white/10 focus-within:border-discord-blurple transition">
            <Search className="w-3.5 h-3.5 text-discord-text-muted mr-1.5 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar miembro..."
              className="bg-transparent text-xs text-white placeholder:text-discord-text-muted focus:outline-none w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-discord-text-muted hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Members List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Mobile View: Render Full Cards */}
          <div className="lg:hidden space-y-2.5">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-xs text-discord-text-muted">
                No se encontraron miembros con "{searchQuery}"
              </div>
            ) : (
              filteredMembers.map(renderMobileCard)
            )}
          </div>

          {/* Desktop View: Render Compact Sections */}
          <div className="hidden lg:block space-y-4">
            {/* Online Members Section */}
            <div>
              <h3 className="text-[11px] font-bold text-discord-text-muted uppercase tracking-wider px-2 mb-1">
                En línea — {onlineMembers.length}
              </h3>
              <div className="space-y-0.5">
                {onlineMembers.map(renderDesktopRow)}
              </div>
            </div>

            {/* Offline Members Section */}
            {offlineMembers.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold text-discord-text-muted uppercase tracking-wider px-2 mb-1">
                  Desconectado — {offlineMembers.length}
                </h3>
                <div className="space-y-0.5">
                  {offlineMembers.map(renderDesktopRow)}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Member Management Modal */}
      <ManageMemberModal
        isOpen={!!selectedMemberForManage}
        onClose={() => setSelectedMemberForManage(null)}
        member={selectedMemberForManage}
        serverId={activeServer?.id}
        isOwner={isServerOwner}
      />

      {/* Member Kick Confirmation Modal */}
      <ConfirmModal
        isOpen={!!selectedMemberForKick}
        onClose={() => setSelectedMemberForKick(null)}
        onConfirm={async () => {
          if (selectedMemberForKick && activeServer) {
            setKickLoading(true);
            await kickMember(activeServer.id, selectedMemberForKick.id);
            setKickLoading(false);
            setSelectedMemberForKick(null);
          }
        }}
        loading={kickLoading}
        title="Expulsar miembro"
        message={`¿Estás seguro de que deseas expulsar a @${selectedMemberForKick?.user.username} del servidor "${activeServer?.name}"?`}
        confirmText="Expulsar Miembro"
        danger={true}
      />
    </>
  );
}
