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

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const showDMs = isDMView || !activeServer;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-discord-chat relative">
      {/* 1. Server Navigation Bar */}
      <ServerSidebar />

      {/* 2. Channel Navigation & User Profile */}
      <ChannelSidebar />

      {/* 3. Main Chat View (Server Channel or Direct Messages) */}
      {showDMs ? (
        <DirectMessageArea />
      ) : (
        <ChatArea
          showMembers={showMembers}
          onToggleMembers={() => setShowMembers(!showMembers)}
        />
      )}

      {/* 4. Server Members List (Only shown when browsing a server) */}
      {!showDMs && activeServer && (
        <MemberSidebar isVisible={showMembers} />
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
