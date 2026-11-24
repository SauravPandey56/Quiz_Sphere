import React, { useState, useEffect } from 'react';

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
};

const UserAvatar = ({ src, name, className = '' }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const hasValidSrc = typeof src === 'string' && src.trim() !== '' && !imgError;

  return (
    <div className={`overflow-hidden flex items-center justify-center ${className}`}>
      {hasValidSrc ? (
        <img
          src={src}
          alt={name ? `${name} avatar` : 'User avatar'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};

export default UserAvatar;
