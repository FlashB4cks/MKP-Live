import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  X,
  Hash,
  Volume2,
  ChevronDown,
  ChevronRight,
  Shield,
  Compass,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useServerStore } from '../../store/serverStore';
import { useDMStore } from '../../store/dmStore';
import UserAvatar from '../common/UserAvatar';

export default function MobileNavDrawer({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenMembers,
  onOpenStartDM,
}) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const servers = useServerStore((state) => state.servers);
  const activeServer = useServerStore((state) => state.activeServer);
  const activeChannel = useServerStore((state) => state.activeChannel);
  const selectServer = useServerStore((state) => state.selectServer);
  const selectChannel = useServerStore((state) => state.selectChannel);
  const setDMView = useServerStore((state) => state.setDMView);
  const isDMView = useServerStore((state) => state.isDMView);

  const conversations = useDMStore((state) => state.conversations);
  const openRequestsView = useDMStore((state) => state.openRequestsView);

  const [serversExpanded, setServersExpanded] = useState(true);

  // Incoming pending contact requests count
  const pendingIncomingCount = conversations.filter(
    (c) =>
      c.status === 'PENDING' &&
      (c.awaiting_my_acceptance ||
        (c.initiated_by && String(c.initiated_by) !== String(user?.id)))
  ).length;

  // Unread DM messages count
  const unreadDMsCount = conversations.reduce(
    (acc, c) => acc + (c.unread_count || 0),
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* 1. Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* 2. Slide-over Drawer Panel */}
      <aside
        className="relative w-[85vw] max-w-[320px] bg-discord-sidebar flex flex-col h-full z-10 shadow-2xl border-r border-white/10 transition-transform duration-300 ease-in-out transform translate-x-0 animate-in slide-in-from-left select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with App Brand & Close Button */}
        <div className="h-14 px-4 border-b border-black/30 flex items-center justify-between bg-discord-sidebar flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-discord-blurple flex items-center justify-center text-white font-black text-sm shadow-md">
              M
            </div>
            <div>
              <span className="font-bold text-sm text-white block leading-tight">
                MKP Live
              </span>
              <span className="text-[10px] text-discord-green font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-discord-green animate-pulse" />
                En vivo
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-discord-text-muted hover:text-white hover:bg-white/10 transition"
            title="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Card */}
        <div
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
          className="p-3 mx-3 mt-3 rounded-xl bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] transition cursor-pointer flex items-center space-x-3 flex-shrink-0"
          title="Ajustes de mi cuenta"
        >
          <UserAvatar user={user} size="md" showOnline={true} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate flex items-center gap-1">
              <span>@{user?.username || 'Usuario'}</span>
              {user?.is_staff && (
                <Shield className="w-3 h-3 text-discord-blurple flex-shrink-0" />
              )}
            </div>
            <div className="text-[11px] text-discord-text-muted truncate">
              {user?.email || 'Sin correo'}
            </div>
            <div className="text-[10px] text-discord-green font-medium mt-0.5 truncate">
              {user?.status_text || 'Cuenta Activa'}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-discord-text-muted flex-shrink-0" />
        </div>

        {/* Scrollable Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Main Navigation Links */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-discord-text-muted tracking-wider px-2 block mb-1">
              Navegación Principal
            </span>

            {/* 1. Dashboard */}
            <button
              type="button"
              onClick={() => {
                if (servers.length > 0) {
                  if (!activeServer) {
                    selectServer(servers[0]);
                  }
                }
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                !isDMView && activeServer
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-discord-text hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <LayoutDashboard className="w-4 h-4 text-discord-blurple group-hover:text-white" />
                <span>Dashboard</span>
              </div>
              <span className="text-[10px] text-discord-text-muted font-normal">
                {activeServer ? activeServer.name : 'Servidores'}
              </span>
            </button>

            {/* 2. User Management */}
            <button
              type="button"
              onClick={() => {
                onClose();
                if (activeServer) {
                  onOpenMembers();
                } else {
                  openRequestsView();
                }
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-discord-text hover:bg-white/5 hover:text-white transition"
            >
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4 text-discord-green" />
                <span>User Management</span>
              </div>
              <span className="text-[10px] text-discord-text-muted font-normal">
                {activeServer ? 'Miembros' : 'Contactos'}
              </span>
            </button>

            {/* 3. Add New User */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStartDM();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-discord-text hover:bg-white/5 hover:text-white transition"
            >
              <div className="flex items-center space-x-3">
                <UserPlus className="w-4 h-4 text-discord-yellow" />
                <span>Add New User</span>
              </div>
              <span className="text-[10px] bg-discord-blurple/20 text-discord-blurple px-1.5 py-0.5 rounded font-bold">
                Nuevo
              </span>
            </button>

            {/* 4. Notifications */}
            <button
              type="button"
              onClick={() => {
                onClose();
                openRequestsView();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-discord-text hover:bg-white/5 hover:text-white transition"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Bell className="w-4 h-4 text-purple-400" />
                  {pendingIncomingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-discord-red animate-ping" />
                  )}
                </div>
                <span>Notifications</span>
              </div>
              {pendingIncomingCount > 0 ? (
                <span className="bg-discord-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                  {pendingIncomingCount}
                </span>
              ) : (
                <span className="text-[10px] text-discord-text-muted">Al día</span>
              )}
            </button>

            {/* 5. Messages */}
            <button
              type="button"
              onClick={() => {
                setDMView();
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                isDMView
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-discord-text hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>Messages</span>
              </div>
              {unreadDMsCount > 0 && (
                <span className="bg-discord-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                  {unreadDMsCount}
                </span>
              )}
            </button>

            {/* 6. Settings */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-discord-text hover:bg-white/5 hover:text-white transition"
            >
              <div className="flex items-center space-x-3">
                <Settings className="w-4 h-4 text-discord-text-muted group-hover:text-white" />
                <span>Settings</span>
              </div>
              <span className="text-[10px] text-discord-text-muted">Cuenta</span>
            </button>
          </div>

          {/* Servers & Channels Section */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setServersExpanded(!serversExpanded)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] uppercase font-bold text-discord-text-muted tracking-wider hover:text-white transition"
            >
              <span>Tus Servidores & Canales</span>
              {serversExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {serversExpanded && (
              <div className="space-y-2 mt-2">
                {servers.length === 0 ? (
                  <div className="text-center py-3 text-xs text-discord-text-muted">
                    No te has unido a ningún servidor.
                  </div>
                ) : (
                  servers.map((srv) => {
                    const isSrvActive = activeServer?.id === srv.id && !isDMView;
                    return (
                      <div
                        key={srv.id}
                        className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden"
                      >
                        {/* Server Header button */}
                        <button
                          type="button"
                          onClick={() => {
                            selectServer(srv);
                            onClose();
                          }}
                          className={`w-full flex items-center justify-between p-2 text-xs font-bold transition text-left ${
                            isSrvActive
                              ? 'bg-discord-active text-white'
                              : 'text-discord-text hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <div className="w-6 h-6 rounded-lg bg-discord-blurple flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                              {srv.icon ? (
                                <img
                                  src={srv.icon}
                                  alt=""
                                  className="w-full h-full rounded-lg object-cover"
                                />
                              ) : (
                                srv.name[0]?.toUpperCase()
                              )}
                            </div>
                            <span className="truncate">{srv.name}</span>
                          </div>
                          {isSrvActive && (
                            <span className="w-2 h-2 rounded-full bg-discord-green flex-shrink-0" />
                          )}
                        </button>

                        {/* Channels under active server */}
                        {isSrvActive && srv.channels && srv.channels.length > 0 && (
                          <div className="px-2 py-1 space-y-0.5 border-t border-white/5 bg-black/20">
                            {srv.channels.map((ch) => {
                              const isChActive = activeChannel?.id === ch.id;
                              return (
                                <button
                                  key={ch.id}
                                  type="button"
                                  onClick={() => {
                                    selectChannel(ch);
                                    onClose();
                                  }}
                                  className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-xs transition ${
                                    isChActive
                                      ? 'bg-discord-blurple text-white font-bold shadow'
                                      : 'text-discord-text-muted hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  {ch.channel_type === 'VOICE' ? (
                                    <Volume2 className="w-3.5 h-3.5 flex-shrink-0" />
                                  ) : (
                                    <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{ch.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Logout */}
        <div className="p-3 border-t border-white/10 bg-discord-sidebar flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-semibold text-discord-red hover:bg-discord-red/10 border border-discord-red/20 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
