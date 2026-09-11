import React, { useState } from 'react';
import { Crown, Shield, MessageSquare, X, Users, Settings, UserMinus } from 'lucide-react';
import { useServerStore } from '../../store/serverStore';
import { useAuthStore } from '../../store/authStore';
import { useDMStore } from '../../store/dmStore';
import ManageMemberModal from '../modals/ManageMemberModal';
import ConfirmModal from '../modals/ConfirmModal';

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

  const onlineMembers = members.filter((m) => m.user.is_online);
  const offlineMembers = members.filter((m) => !m.user.is_online);

  const handleStartDM = async (memberUser) => {
    if (memberUser.id === currentUser?.id) return;
    await startDirectMessage(memberUser.id);
    setDMView();
  };

  const renderMember = (member) => {
    const isOwner = member.role === 'OWNER';
    const isAdmin = member.role === 'ADMIN';
    const isMe = member.user.id === currentUser?.id;

    return (
      <div
        key={member.id}
        onClick={() => !isMe && handleStartDM(member.user)}
        className="group flex items-center px-2 py-1.5 rounded hover:bg-discord-hover transition cursor-pointer select-none"
        title={!isMe ? `Enviar mensaje directo a @${member.user.username}` : undefined}
      >
        {/* Avatar with Status Dot */}
        <div className="relative mr-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center font-bold text-white text-xs overflow-hidden">
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
          <div
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-discord-channels ${
              member.user.is_online ? 'bg-discord-green' : 'bg-discord-text-muted'
            }`}
          />
        </div>

        {/* Member Info */}
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
            {/* Quick DM Button on Hover */}
            {!isMe && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartDM(member.user);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-discord-text-muted hover:text-white hover:bg-discord-active rounded transition"
                title={`Enviar mensaje directo a @${member.user.username}`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-discord-blurple" />
              </button>
            )}

            {/* Moderation: Manage Permissions & Roles button */}
            {!isMe && !isOwner && canManageRoles && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMemberForManage(member);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-discord-text-muted hover:text-white hover:bg-discord-active rounded transition"
                title={`Gestionar permisos de @${member.user.username}`}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Moderation: Kick Member button */}
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

            {/* Role Icons */}
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
      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Member Sidebar: Slide-over drawer on mobile/tablet (< lg), fixed column on desktop (lg+) */}
      <aside
        className={`fixed lg:static inset-y-0 right-0 z-50 lg:z-auto w-64 lg:w-60 flex-shrink-0 bg-discord-channels p-3 overflow-y-auto space-y-4 select-none border-l border-black/10 shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } ${!isVisible ? 'lg:hidden' : 'lg:block'}`}
      >
        {/* Mobile Header with Close Button */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 lg:hidden">
          <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wider">
            <Users className="w-4 h-4 text-discord-blurple" />
            <span>Miembros del servidor</span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded text-discord-text-muted hover:text-white hover:bg-discord-hover transition"
              title="Cerrar lista de miembros"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Online Section */}
        <div>
          <h3 className="text-[11px] font-bold text-discord-text-muted uppercase tracking-wider px-2 mb-1">
            En línea — {onlineMembers.length}
          </h3>
          <div className="space-y-0.5">
            {onlineMembers.map(renderMember)}
          </div>
        </div>

        {/* Offline Section */}
        {offlineMembers.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold text-discord-text-muted uppercase tracking-wider px-2 mb-1">
              Desconectado — {offlineMembers.length}
            </h3>
            <div className="space-y-0.5">
              {offlineMembers.map(renderMember)}
            </div>
          </div>
        )}
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
