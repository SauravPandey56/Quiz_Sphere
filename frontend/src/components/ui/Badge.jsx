import React from 'react';

/**
 * Reusable Badge component for status tags, roles, metrics, and state pills.
 * 
 * Variants:
 * - primary: Violet tint
 * - success: Emerald green tint (LIVE, Active, Completed, Correct)
 * - danger: Rose/pink tint (Closed, Rejected, Wrong, Blocked)
 * - warning: Amber tint (Paused, Upcoming, Review, Pending)
 * - gold: Gold tint (Score, Rank, Achievement)
 * - neutral: Muted surface-2 tint (Draft, Default)
 */
export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-semibold tracking-wide select-none rounded-full whitespace-nowrap transition-colors';

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  };

  const variantStyles = {
    primary: 'bg-[#7C5CFF]/15 text-[#A78BFA] border border-[#7C5CFF]/30',
    success: 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30',
    danger: 'bg-[#FB7185]/15 text-[#FB7185] border border-[#FB7185]/30',
    warning: 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30',
    gold: 'bg-[#F5C451]/15 text-[#F5C451] border border-[#F5C451]/30',
    neutral: 'bg-[#1C2540] text-[#94A3B8] border border-[#2A3556]',
  };

  const dotColor = {
    primary: 'bg-[#7C5CFF]',
    success: 'bg-[#34D399]',
    danger: 'bg-[#FB7185]',
    warning: 'bg-[#FBBF24]',
    gold: 'bg-[#F5C451]',
    neutral: 'bg-[#94A3B8]',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.neutral} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor[variant] || 'bg-[#94A3B8]'}`} />
      )}
      {children}
    </span>
  );
};

export default Badge;
