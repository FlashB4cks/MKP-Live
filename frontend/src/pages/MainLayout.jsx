import React, { useEffect, useState } from 'react';
import { MessageSquare, Compass, Users, Video, Hash } from 'lucide-react';
import ServerSidebar from '../components/servers/ServerSidebar';
import ChannelSidebar from '../components/channels/ChannelSidebar';
import ChatArea from '../components/chat/ChatArea';
import DirectMessageArea from '../components/chat/DirectMessageArea';
import MemberSidebar from '../components/members/MemberSidebar';
import VirtualSessionRoom from '../components/sessions/VirtualSessionRoom';
import { useServerStore } from '../store/serverStore';
import { useSessionStore } from '../store/sessionStore';

export default function MainLayout() {
  const fetchServers = useServerStore((state) => state.fetchServers);
  const activeServer = useServerStore((state) => state.activeServer);
  const isDMView = useServerStore((state) => state.isDMView);
  const setDMView = useServerStore((state) => state.setDMView);
  const activeSession = useSessionStore((state) => state.activeSession);
  const leaveActiveSession = useSessionStore((state) => state.leaveActiveSession);
  const restoreActiveSession = useSessionStore((state) => state.restoreActiveSession);
  const setIsMinimized = useSessionStore((state) => state.setIsMinimized);

  const [showMembers, setShowMembers] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);

  useEffect(() => {
    fetchServers();
    restoreActiveSession();
  }, [fetchServers, restoreActiveSession]);

  const showDMs = isDMView || !activeServer;

  const handleToggleMembers = () => {
    if (window.innerWidth < 1024) {
      setMobileMembersOpen(!mobileMembersOpen);
    } else {
      setShowMembers(!showMembers);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-discord-chat relative">
      {/* Mobile Left Drawer Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Left Navigation: Server Bar + Channel Bar */}
      {/* On desktop (md+): flex layout. On mobile: fixed slide-over drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex md:static md:z-auto h-full flex-shrink-0 transition-transform duration-300 ease-in-out ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* 1. Server Navigation Bar */}
        <ServerSidebar onSelectDM={() => setMobileNavOpen(false)} />

        {/* 2. Channel Navigation & User Profile */}
        <ChannelSidebar
          onChannelSelect={() => setMobileNavOpen(false)}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
      </div>

      {/* 3. Main Chat View (Server Channel or Direct Messages) */}
      {showDMs ? (
        <DirectMessageArea onOpenMobileNav={() => setMobileNavOpen(true)} />
      ) : (
        <ChatArea
          showMembers={showMembers}
          onToggleMembers={handleToggleMembers}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
      )}

      {/* 4. Server Members List (Only shown when browsing a server) */}
      {!showDMs && activeServer && (
        <MemberSidebar
          isVisible={showMembers}
          isOpenMobile={mobileMembersOpen}
          onCloseMobile={() => setMobileMembersOpen(false)}
        />
      )}

      {/* 5. Mobile Bottom Navigation Bar (Fixed for Mobile Portrait mode) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-discord-sidebar border-t border-black/40 flex items-center justify-around px-2 md:hidden select-none">
        {/* Direct Messages Shortcut */}
        <button
          onClick={() => {
            setDMView();
            setMobileNavOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            showDMs ? 'text-discord-blurple font-bold' : 'text-discord-text-muted hover:text-white'
          }`}
          title="Mensajes Directos"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Mensajes</span>
        </button>

        {/* Servers & Channels Drawer Toggle */}
        <button
          onClick={() => setMobileNavOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            !showDMs ? 'text-discord-blurple font-bold' : 'text-discord-text-muted hover:text-white'
          }`}
          title="Servidores y Canales"
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Servidores</span>
        </button>

        {/* Server Members Drawer Toggle (when in server) */}
        {!showDMs && activeServer ? (
          <button
            onClick={() => setMobileMembersOpen(!mobileMembersOpen)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              mobileMembersOpen ? 'text-discord-blurple font-bold' : 'text-discord-text-muted hover:text-white'
            }`}
            title="Integrantes del Servidor"
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Integrantes</span>
          </button>
        ) : (
          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-discord-text-muted hover:text-white transition"
            title="Explorar Canales"
          >
            <Hash className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Explorar</span>
          </button>
        )}

        {/* Active Virtual Session Floating Shortcut */}
        {activeSession && (
          <button
            onClick={() => setIsMinimized(false)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-discord-green font-bold transition"
            title="Reunión activa - Toca para volver"
          >
            <div className="relative">
              <Video className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-discord-green animate-ping" />
            </div>
            <span className="text-[10px] mt-0.5">En Reunión</span>
          </button>
        )}
      </nav>

      {/* 6. Virtual Session Call Room (Fullscreen or Minimized Floating PiP) */}
      {activeSession && (
        <VirtualSessionRoom
          session={activeSession}
          onLeave={leaveActiveSession}
        />
      )}
    </div>
  );
}
