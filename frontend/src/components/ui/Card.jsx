import React from 'react';

/**
 * Reusable Card container conforming to the 16px radius, subtle border,
 * and surface hierarchy of the Dark Premium SaaS design system.
 * 
 * Variants:
 * - default: Standard surface (#131A2E) with border (#2A3556).
 * - elevated: Elevated surface-2 (#1C2540) with premium shadow.
 * - interactive: Default card with hover elevation, subtle border glow, and pointer styling.
 */
export const Card = React.forwardRef(({
  children,
  variant = 'default',
  className = '',
  padding = 'md',
  ...props
}, ref) => {
  const baseStyles = 'rounded-[16px] border transition-all duration-200 relative overflow-hidden';

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  const variantStyles = {
    default: 'bg-[#131A2E] border-[#2A3556] text-[#F1F5F9] shadow-[0_10px_30px_rgba(0,0,0,0.25)]',
    elevated: 'bg-[#1C2540] border-[#2A3556] text-[#F1F5F9] shadow-[0_12px_36px_rgba(0,0,0,0.35)]',
    interactive: 'bg-[#131A2E] border-[#2A3556] text-[#F1F5F9] shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:border-[#7C5CFF]/50 hover:shadow-[0_12px_36px_rgba(124,92,255,0.15)] hover:-translate-y-0.5 cursor-pointer',
  };

  return (
    <div
      ref={ref}
      className={`${baseStyles} ${paddingStyles[padding] || paddingStyles.md} ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
export default Card;
