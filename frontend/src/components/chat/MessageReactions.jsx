import React from 'react';
import { Smile } from 'lucide-react';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '😮'];

export function ReactionBar({ onSelectEmoji }) {
  return (
    <div className="flex items-center space-x-0.5 bg-discord-sidebar border border-white/10 rounded-full px-1.5 py-0.5 shadow-xl backdrop-blur-md">
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectEmoji(emoji);
          }}
          className="hover:scale-125 p-1 text-sm rounded transition-transform select-none"
          title={`Reaccionar con ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function ReactionBadges({ reactions, currentUserId, onToggleReaction }) {
  if (!reactions || typeof reactions !== 'object') return null;

  const entries = Object.entries(reactions).filter(
    ([, userIds]) => Array.isArray(userIds) && userIds.length > 0
  );

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5 select-none">
      {entries.map(([emoji, userIds]) => {
        const hasReacted = currentUserId && userIds.some(
          (id) => String(id) === String(currentUserId)
        );

        return (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction(emoji);
            }}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-semibold border transition ${
              hasReacted
                ? 'bg-discord-blurple/20 border-discord-blurple text-discord-blurple'
                : 'bg-discord-sidebar/80 border-white/10 text-discord-text-muted hover:border-white/25 hover:text-white'
            }`}
            title={`${userIds.length} persona${userIds.length > 1 ? 's' : ''} reaccionaron con ${emoji}`}
          >
            <span className="text-sm">{emoji}</span>
            <span className="text-[11px]">{userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function MessageReactions({
  reactions,
  currentUserId,
  onToggleReaction,
}) {
  return (
    <ReactionBadges
      reactions={reactions}
      currentUserId={currentUserId}
      onToggleReaction={onToggleReaction}
    />
  );
}
