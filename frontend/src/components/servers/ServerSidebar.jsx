import React, { useState } from 'react';
import { Plus, Compass, MessageSquare } from 'lucide-react';
import { useServerStore } from '../../store/serverStore';
import { useDMStore } from '../../store/dmStore';
import { useAuthStore } from '../../store/authStore';
import CreateServerModal from '../modals/CreateServerModal';
import JoinServerModal from '../modals/JoinServerModal';

export default function ServerSidebar({ onSelectDM }) {
  const servers = useServerStore((state) => state.servers);
  const activeServer = useServerStore((state) => state.activeServer);
  const selectServer = useServerStore((state) => state.selectServer);
  const setDMView = useServerStore((state) => state.setDMView);
  const isDMView = useServerStore((state) => state.isDMView);
  const conversations = useDMStore((state) => state.conversations);
  const user = useAuthStore((state) => state.user);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const isDMsActive = !activeServer || isDMView;

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const pendingIncoming = conversations.filter(
    (c) =>
      c.status === 'PENDING' &&
      (c.awaiting_my_acceptance ||
        (c.initiated_by && String(c.initiated_by) !== String(user?.id)))
  ).length;
  const totalNotifications = totalUnread + pendingIncoming;

  return (
    <aside className="w-[72px] flex-shrink-0 bg-discord-sidebar flex flex-col items-center py-3 space-y-2 select-none z-20">
      {/* Direct Messages / Discord Home Button */}
      <div className="relative group flex items-center justify-center w-full">
        {/* Indicator Pill */}
        <div
          className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
            isDMsActive ? 'h-10' : 'h-0 group-hover:h-5'
          }`}
        />
        <div className="relative">
          <button
            onClick={() => {
              setDMView();
              onSelectDM?.();
            }}
            className={`w-12 h-12 rounded-[24px] group-hover:rounded-[16px] flex items-center justify-center transition-all duration-200 ${
              isDMsActive
                ? 'bg-discord-blurple rounded-[16px] text-white shadow-lg'
                : 'bg-discord-chat hover:bg-discord-blurple text-discord-text hover:text-white'
            }`}
            title="MKP Live - Mensajes Directos y Solicitudes"
          >
            <img
              src="/logo-icon.png"
              alt="MKP Live"
              className="w-7 h-7 object-contain group-hover:scale-110 transition-transform duration-200"
            />
          </button>
          {totalNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-discord-red text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border-2 border-discord-sidebar shadow z-10 animate-pulse">
              {totalNotifications}
            </span>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="w-8 h-[2px] bg-discord-chat rounded-full my-1" />

      {/* Server List */}
      <div className="flex-1 w-full flex flex-col items-center space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
        {servers.map((server) => {
          const isActive = activeServer?.id === server.id;
          const initials = server.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 3)
            .toUpperCase();

          return (
            <div
              key={server.id}
              className="relative group flex items-center justify-center w-full"
            >
              {/* Active / Hover Pill Indicator */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                  isActive ? 'h-10' : 'h-0 group-hover:h-5'
                }`}
              />

              <button
                onClick={() => selectServer(server)}
                className={`w-12 h-12 flex items-center justify-center transition-all duration-200 font-semibold overflow-hidden ${
                  isActive
                    ? 'rounded-[16px] bg-discord-blurple text-white shadow-lg'
                    : 'rounded-[24px] hover:rounded-[16px] bg-discord-chat hover:bg-discord-blurple text-discord-text hover:text-white'
                }`}
                title={server.name}
              >
                {server.icon_url ? (
                  <img
                    src={server.icon_url}
                    alt={server.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold tracking-tight">
                    {initials}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Server Button */}
      <div className="relative group flex items-center justify-center w-full">
        <div className="absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 h-0 group-hover:h-5" />
        <button
          onClick={() => setIsCreateOpen(true)}
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-discord-chat hover:bg-discord-green text-discord-green hover:text-white flex items-center justify-center transition-all duration-200"
          title="Añadir un servidor"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Explore / Join Server Button */}
      <div className="relative group flex items-center justify-center w-full">
        <div className="absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 h-0 group-hover:h-5" />
        <button
          onClick={() => setIsJoinOpen(true)}
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-discord-chat hover:bg-discord-green text-discord-green hover:text-white flex items-center justify-center transition-all duration-200"
          title="Unirse a un servidor"
        >
          <Compass className="w-6 h-6" />
        </button>
      </div>

      <CreateServerModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      <JoinServerModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />
    </aside>
  );
}
