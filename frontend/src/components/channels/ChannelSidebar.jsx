import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Hash,
  Plus,
  UserPlus,
  LogOut,
  Settings,
  Volume2,
  Trash2,
  MessageSquare,
  X,
  UserCheck,
  Users,
} from 'lucide-react';
import { useServerStore } from '../../store/serverStore';
import { useAuthStore } from '../../store/authStore';
import { useDMStore } from '../../store/dmStore';
import CreateChannelModal from '../modals/CreateChannelModal';
import InviteModal from '../modals/InviteModal';
import ConfirmModal from '../modals/ConfirmModal';
import StartDMModal from '../modals/StartDMModal';
import AccountSettingsModal from '../modals/AccountSettingsModal';

export default function ChannelSidebar({ onChannelSelect, onCloseMobile }) {
  const activeServer = useServerStore((state) => state.activeServer);
  const activeChannel = useServerStore((state) => state.activeChannel);
  const selectChannel = useServerStore((state) => state.selectChannel);
  const deleteServer = useServerStore((state) => state.deleteServer);
  const deleteChannel = useServerStore((state) => state.deleteChannel);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const isDMView = useServerStore((state) => state.isDMView);
  const conversations = useDMStore((state) => state.conversations);
  const activeConversation = useDMStore((state) => state.activeConversation);
  const viewMode = useDMStore((state) => state.viewMode);
  const openRequestsView = useDMStore((state) => state.openRequestsView);
  const fetchConversations = useDMStore((state) => state.fetchConversations);
  const selectConversation = useDMStore((state) => state.selectConversation);
  const deleteConversation = useDMStore((state) => state.deleteConversation);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteServerOpen, setDeleteServerOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState(null);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [startDMOpen, setStartDMOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  const dropdownRef = useRef(null);

  // Compute incoming pending requests
  const pendingIncomingCount = conversations.filter(
    (c) =>
      c.status === 'PENDING' &&
      (c.awaiting_my_acceptance ||
        (c.initiated_by && String(c.initiated_by) !== String(user?.id)))
  ).length;

  // Fetch DM conversations when in DM view or on mount, with background refresh
  useEffect(() => {
    if (!activeServer || isDMView) {
      fetchConversations();
      const interval = setInterval(() => {
        fetchConversations();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [activeServer, isDMView, fetchConversations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOwner = activeServer?.my_role === 'OWNER';
  const isAdminOrOwner = isOwner || activeServer?.my_role === 'ADMIN';

  const handleDeleteServer = async () => {
    if (!activeServer) return;
    setActionLoading(true);
    await deleteServer(activeServer.id);
    setActionLoading(false);
    setDeleteServerOpen(false);
  };

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;
    setActionLoading(true);
    await deleteChannel(channelToDelete.id);
    setActionLoading(false);
    setChannelToDelete(null);
  };

  const channels = activeServer?.channels || [];

  return (
    <aside className="w-60 flex-shrink-0 bg-discord-channels flex flex-col justify-between select-none">
      {/* Server Header */}
      <div>
        {activeServer ? (
          <div className="relative" ref={dropdownRef}>
            <div className="w-full h-12 px-3 sm:px-4 flex items-center justify-between border-b border-black/20 hover:bg-discord-hover transition text-white font-semibold text-sm shadow-sm">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-between flex-1 min-w-0 mr-2 text-left"
              >
                <span className="truncate">{activeServer.name}</span>
                <ChevronDown
                  className={`w-4 h-4 ml-1 flex-shrink-0 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {onCloseMobile && (
                <button
                  onClick={onCloseMobile}
                  className="md:hidden p-1 text-discord-text-muted hover:text-white rounded transition"
                  title="Cerrar navegación"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute top-14 left-2 right-2 z-30 bg-discord-sidebar rounded-md p-1.5 shadow-2xl border border-black/30 space-y-1">
                <button
                  onClick={() => {
                    setInviteOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-discord-blurple hover:bg-discord-blurple hover:text-white rounded transition"
                >
                  <span>Invitar gente</span>
                  <UserPlus className="w-4 h-4" />
                </button>

                {isAdminOrOwner && (
                  <button
                    onClick={() => {
                      setCreateChannelOpen(true);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-discord-text hover:bg-discord-hover hover:text-white rounded transition"
                  >
                    <span>Crear canal</span>
                    <Plus className="w-4 h-4" />
                  </button>
                )}

                {isOwner && (
                  <>
                    <div className="h-[1px] bg-white/10 my-1" />
                    <button
                      onClick={() => {
                        setDeleteServerOpen(true);
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-discord-red hover:bg-discord-red hover:text-white rounded transition"
                    >
                      <span>Eliminar servidor</span>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-12 px-3 sm:px-4 flex items-center justify-between border-b border-black/20 text-white font-semibold text-sm shadow-sm">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-discord-blurple" />
              <span>Mensajes Directos</span>
            </div>
            {onCloseMobile && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={onCloseMobile}
                  className="md:hidden p-1 text-discord-text-muted hover:text-white rounded transition"
                  title="Cerrar navegación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Channel Categories & List / DM List */}
        <div className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-112px)]">
          {activeServer ? (
            <div>
              {/* Category Header */}
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-discord-text-muted tracking-wider uppercase">
                <span>Canales de Texto</span>
                {isAdminOrOwner && (
                  <button
                    onClick={() => setCreateChannelOpen(true)}
                    className="hover:text-white transition"
                    title="Crear canal"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Channels List */}
              <div className="space-y-0.5 mt-1">
                {channels.map((channel) => {
                  const isActive = activeChannel?.id === channel.id;
                  return (
                    <div
                      key={channel.id}
                      onClick={() => {
                        selectChannel(channel);
                        onChannelSelect?.();
                      }}
                      className={`w-full group flex items-center justify-between px-2 py-1.5 rounded text-sm transition cursor-pointer ${
                        isActive
                          ? 'bg-discord-active text-white font-medium'
                          : 'text-discord-text hover:bg-discord-hover hover:text-white'
                      }`}
                    >
                      <div className="flex items-center min-w-0">
                        <Hash className="w-4 h-4 mr-1.5 text-discord-text-muted group-hover:text-white flex-shrink-0" />
                        <span className="truncate">{channel.name}</span>
                      </div>

                      {isAdminOrOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setChannelToDelete(channel);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-discord-red text-discord-text-muted transition rounded"
                          title="Eliminar canal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              {/* Solicitudes de contacto / amigos prominent button */}
              <div className="px-2 mb-2">
                <button
                  onClick={() => {
                    openRequestsView();
                    onChannelSelect?.();
                  }}
                  className={`w-full group flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                    viewMode === 'requests' && !activeConversation
                      ? 'bg-discord-active text-white'
                      : 'text-discord-text hover:bg-discord-hover hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <UserCheck className="w-4 h-4 text-discord-blurple group-hover:scale-110 transition-transform" />
                    <span>Solicitudes</span>
                  </div>
                  {pendingIncomingCount > 0 && (
                    <span className="bg-discord-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow animate-pulse">
                      {pendingIncomingCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Section Header */}
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-discord-text-muted tracking-wider uppercase">
                <span>Mensajes Directos</span>
                <button
                  onClick={() => setStartDMOpen(true)}
                  className="hover:text-white transition p-0.5 rounded hover:bg-white/5"
                  title="Nuevo mensaje directo"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Conversations List */}
              <div className="space-y-0.5 mt-1">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-discord-text-muted space-y-2">
                    <p>No tienes mensajes directos aún.</p>
                    <button
                      onClick={() => setStartDMOpen(true)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-discord-blurple text-white rounded hover:bg-discord-blurple-hover transition"
                    >
                      Buscar usuarios
                    </button>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const partner = conv.other_user || conv.participants?.find((p) => p.id !== user?.id);
                    const isActive = activeConversation?.id === conv.id && viewMode === 'chat';
                    const isPending = conv.status === 'PENDING';
                    const isIncoming =
                      isPending &&
                      (conv.awaiting_my_acceptance ||
                        (conv.initiated_by && String(conv.initiated_by) !== String(user?.id)));

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          selectConversation(conv);
                          onChannelSelect?.();
                        }}
                        className={`w-full group flex items-center justify-between px-2 py-2 rounded-lg text-sm transition cursor-pointer ${
                          isActive
                            ? 'bg-discord-active text-white font-medium'
                            : 'text-discord-text hover:bg-discord-hover hover:text-white'
                        }`}
                      >
                        <div className="flex items-center min-w-0 space-x-2.5">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center font-bold text-white text-xs overflow-hidden">
                              {partner?.avatar_url ? (
                                <img
                                  src={partner.avatar_url}
                                  alt={partner.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                partner?.username?.[0]?.toUpperCase() || 'U'
                              )}
                            </div>
                            {partner?.is_online && (
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-discord-green rounded-full border-2 border-discord-channels" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="truncate text-xs font-semibold leading-tight">
                                @{partner?.username || 'Usuario'}
                              </span>
                              {isPending && (
                                <span
                                  className={`text-[9px] px-1 py-0.2 rounded font-semibold flex-shrink-0 ${
                                    isIncoming
                                      ? 'bg-discord-yellow/20 text-discord-yellow'
                                      : 'bg-white/10 text-discord-text-muted'
                                  }`}
                                >
                                  {isIncoming ? 'Solicitud' : 'Pendiente'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-discord-text-muted truncate leading-tight mt-0.5 max-w-[120px]">
                              {conv.last_message?.content || partner?.status_text || (isPending ? 'Solicitud pendiente' : 'Sin mensajes')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          {conv.unread_count > 0 && (
                            <span className="bg-discord-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 shadow">
                              {conv.unread_count}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConversationToDelete(conv);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-discord-red text-discord-text-muted transition rounded"
                            title="Eliminar conversación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Footer Card */}
      <div className="h-[52px] bg-discord-sidebar/60 px-2 flex items-center justify-between">
        <div
          onClick={() => setAccountSettingsOpen(true)}
          className="flex items-center space-x-2 min-w-0 flex-1 p-1 rounded-lg hover:bg-white/5 cursor-pointer transition mr-1"
          title="Ajustes de mi cuenta"
        >
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center font-bold text-white text-xs overflow-hidden shadow">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user?.username?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            {/* Green Online Dot */}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-discord-green rounded-full border-2 border-discord-channels" />
          </div>

          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {user?.username}
            </div>
            <div className="text-[10px] text-discord-text-muted truncate">
              {user?.status_text || 'En línea'}
            </div>
          </div>
        </div>

        {/* Action buttons (Settings & Logout) */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => setAccountSettingsOpen(true)}
            className="p-1.5 text-discord-text-muted hover:text-white hover:bg-discord-hover rounded transition"
            title="Ajustes de usuario"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            className="p-1.5 text-discord-text-muted hover:text-discord-red hover:bg-discord-hover rounded transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <StartDMModal
        isOpen={startDMOpen}
        onClose={() => setStartDMOpen(false)}
      />

      <AccountSettingsModal
        isOpen={accountSettingsOpen}
        onClose={() => setAccountSettingsOpen(false)}
      />

      <ConfirmModal
        isOpen={!!conversationToDelete}
        onClose={() => setConversationToDelete(null)}
        onConfirm={async () => {
          if (conversationToDelete) {
            await deleteConversation(conversationToDelete.id);
            setConversationToDelete(null);
          }
        }}
        title="Eliminar conversación"
        message="¿Estás seguro de que deseas eliminar esta conversación y todos sus mensajes? Esta acción no se puede deshacer."
        confirmText="Eliminar Conversación"
        danger={true}
      />

      {activeServer && (
        <>
          <CreateChannelModal
            isOpen={createChannelOpen}
            onClose={() => setCreateChannelOpen(false)}
            serverId={activeServer.id}
          />
          <InviteModal
            isOpen={inviteOpen}
            onClose={() => setInviteOpen(false)}
            server={activeServer}
          />
          <ConfirmModal
            isOpen={deleteServerOpen}
            onClose={() => setDeleteServerOpen(false)}
            onConfirm={handleDeleteServer}
            loading={actionLoading}
            title="Eliminar servidor"
            message={`¿Estás seguro de que deseas eliminar "${activeServer.name}"? Esta acción no se puede deshacer y borrará permanentemente todos sus canales y mensajes.`}
            confirmText="Eliminar Servidor"
            danger={true}
          />
          <ConfirmModal
            isOpen={!!channelToDelete}
            onClose={() => setChannelToDelete(null)}
            onConfirm={handleDeleteChannel}
            loading={actionLoading}
            title="Eliminar canal"
            message={`¿Estás seguro de que deseas eliminar el canal #${channelToDelete?.name}? Todos los mensajes de este canal serán borrados permanentemente.`}
            confirmText="Eliminar Canal"
            danger={true}
          />
        </>
      )}
    </aside>
  );
}
