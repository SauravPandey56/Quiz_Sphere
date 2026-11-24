import React from 'react';

/**
 * Reusable Skeleton loader for placeholder states and shimmer transitions.
 */
export const Skeleton = ({
  className = '',
  variant = 'rectangular', // 'rectangular' | 'circular' | 'text'
  width,
  height,
}) => {
  const variantStyles = {
    rectangular: 'rounded-[12px]',
    circular: 'rounded-full',
    text: 'rounded-[6px] h-4 w-full',
  };

  return (
    <div
      className={`bg-[#1C2540] animate-pulse border border-[#2A3556]/40 ${variantStyles[variant] || variantStyles.rectangular} ${className}`}
      style={{
        width: width,
        height: height,
      }}
    />
  );
};

export default Skeleton;
