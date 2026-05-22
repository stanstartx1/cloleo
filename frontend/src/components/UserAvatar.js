import React from 'react';
import { toAbsoluteMediaUrl } from '../utils/media';

const UserAvatar = ({ photo, name, size = 'w-10 h-10', textSize = 'text-sm', className = '' }) => {
  const initial = (name || '?').charAt(0).toUpperCase();

  if (photo) {
    return (
      <img
        src={toAbsoluteMediaUrl(photo)}
        alt={name || 'Profil'}
        className={`${size} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center ${className}`}>
      <span className={`font-bold ${textSize}`}>{initial}</span>
    </div>
  );
};

export default UserAvatar;
