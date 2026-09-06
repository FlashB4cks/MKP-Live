import React, { useEffect, useState } from 'react';
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
  const activeSession = useSessionStore((state) => state.activeSession);
  const leaveActiveSession = useSessionStore((state) => state.leaveActiveSession);

  const [showMembers, setShowMembers] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

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
        <ServerSidebar />

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

      {/* 5. Virtual Session Call Room (Fullscreen or Minimized Floating PiP) */}
      {activeSession && (
        <VirtualSessionRoom
          session={activeSession}
          onLeave={leaveActiveSession}
        />
      )}
    </div>
  );
}
