import React, { useState, useEffect } from 'react';
import { getMediaUrl } from '../../utils/media';

export default function UserAvatar({
  user,
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showOnline = false,
  className = '',
}) {
  const [imgError, setImgError] = useState(false);

  const rawUrl = user?.avatar_url || user?.avatar;
  const avatarUrl = getMediaUrl(rawUrl);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-20 h-20 text-2xl',
  };

  const dotSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
  };

  const username = user?.username || 'Usuario';
  const initial = username[0]?.toUpperCase() || 'U';
  const isOnline = Boolean(user?.is_online);

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${
          sizeClasses[size] || sizeClasses.md
        } rounded-full bg-discord-blurple flex items-center justify-center font-bold text-white overflow-hidden shadow-sm select-none`}
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt=""
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {showOnline && isOnline && (
        <div
          className={`absolute bottom-0 right-0 ${
            dotSizes[size] || dotSizes.md
          } bg-discord-green rounded-full border-2 border-discord-chat`}
          title="En línea"
        />
      )}
    </div>
  );
}
