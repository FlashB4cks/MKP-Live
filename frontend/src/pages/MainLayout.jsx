import React, { useEffect, useState } from 'react';
import ServerSidebar from '../components/servers/ServerSidebar';
import ChannelSidebar from '../components/channels/ChannelSidebar';
import ChatArea from '../components/chat/ChatArea';
import DirectMessageArea from '../components/chat/DirectMessageArea';
import MemberSidebar from '../components/members/MemberSidebar';
import VirtualSessionRoom from '../components/sessions/VirtualSessionRoom';
import AccountSettingsModal from '../components/modals/AccountSettingsModal';
import StartDMModal from '../components/modals/StartDMModal';
import MobileNavDrawer from '../components/navigation/MobileNavDrawer';
import { useServerStore } from '../store/serverStore';
import { useSessionStore } from '../store/sessionStore';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { useDMStore } from '../store/dmStore';

export default function MainLayout() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
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
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [isStartDMModalOpen, setIsStartDMModalOpen] = useState(false);

  useEffect(() => {
    fetchServers();
    restoreActiveSession();
  }, [fetchServers, restoreActiveSession]);

  useEffect(() => {
    if (token) {
      useSocketStore.getState().connect(token);
    }
  }, [token]);

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
      {/* 1. Left Navigation on Desktop (md+): Server Bar + Channel Bar */}
      <div className="hidden md:flex h-full flex-shrink-0">
        <ServerSidebar onSelectDM={() => {}} />
        <ChannelSidebar />
      </div>

      {/* 2. Main Chat View (Server Channel or Direct Messages) */}
      {showDMs ? (
        <DirectMessageArea onOpenMobileNav={() => setMobileNavOpen(true)} />
      ) : (
        <ChatArea
          showMembers={showMembers}
          onToggleMembers={handleToggleMembers}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
      )}

      {/* 3. Server Members List (Only shown when browsing a server) */}
      {!showDMs && activeServer && (
        <MemberSidebar
          isVisible={showMembers}
          isOpenMobile={mobileMembersOpen}
          onCloseMobile={() => setMobileMembersOpen(false)}
        />
      )}

      {/* 4. Mobile Lateral Navigation Drawer */}
      <MobileNavDrawer
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onOpenSettings={() => setMobileSettingsOpen(true)}
        onOpenMembers={() => {
          if (activeServer) {
            setMobileMembersOpen(true);
          } else {
            useDMStore.getState().openRequestsView();
          }
        }}
        onOpenStartDM={() => setIsStartDMModalOpen(true)}
      />

      {/* 5. Start Direct Message / Add User Modal */}
      <StartDMModal
        isOpen={isStartDMModalOpen}
        onClose={() => setIsStartDMModalOpen(false)}
      />

      {/* 6. Virtual Session Call Room (Fullscreen or Minimized Floating PiP) */}
      {activeSession && (
        <VirtualSessionRoom
          session={activeSession}
          onLeave={() => leaveActiveSession(activeSession?.id)}
        />
      )}

      {/* 7. Mobile & Desktop Account Settings Modal */}
      <AccountSettingsModal
        isOpen={mobileSettingsOpen}
        onClose={() => setMobileSettingsOpen(false)}
      />
    </div>
  );
}
