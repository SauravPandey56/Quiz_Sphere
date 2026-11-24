import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button component aligned with the Dark Premium SaaS design system.
 * 
 * Variants:
 * - primary: Violet gradient with subtle hover elevation and soft glow.
 * - secondary: Elevated surface-2 with border.
 * - outline: Subtle surface border, hover fill.
 * - ghost: Transparent background, hover surface.
 * - danger: Muted red surface with red border.
 * - gold: Amber/gold gradient for primary completion / achievement actions.
 */
export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = 'left',
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1020] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-[10px] gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-[12px] gap-2',
    lg: 'text-base px-6 py-3.5 rounded-[14px] gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-[#7C5CFF] to-[#4F8CFF] text-white hover:from-[#6B4DE6] hover:to-[#3F7CE6] shadow-[0_4px_16px_rgba(124,92,255,0.25)] hover:shadow-[0_6px_20px_rgba(124,92,255,0.35)] hover:-translate-y-0.5',
    secondary: 'bg-[#1C2540] text-[#F1F5F9] border border-[#2A3556] hover:bg-[#232F52] hover:border-[#384670]',
    outline: 'bg-transparent text-[#F1F5F9] border border-[#2A3556] hover:bg-[#131A2E] hover:border-[#384670]',
    ghost: 'bg-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1C2540]/60',
    danger: 'bg-[#FB7185]/10 text-[#FB7185] border border-[#FB7185]/20 hover:bg-[#FB7185]/20 hover:border-[#FB7185]/40',
    gold: 'bg-gradient-to-r from-[#F5C451] to-[#E8A33D] text-[#0B1020] font-bold hover:brightness-105 shadow-[0_4px_16px_rgba(245,196,81,0.25)] hover:-translate-y-0.5',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 size={iconSizes[size] || 16} className="animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={iconSizes[size] || 16} className="shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon size={iconSizes[size] || 16} className="shrink-0" />}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
