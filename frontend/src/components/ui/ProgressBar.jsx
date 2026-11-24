import React from 'react';

/**
 * Reusable ProgressBar component with smooth animation and violet-to-blue gradient fill.
 */
export const ProgressBar = ({
  value = 0,
  max = 100,
  showLabel = false,
  label = '',
  height = 'h-2',
  className = '',
  variant = 'primary', // 'primary' | 'gold' | 'success'
}) => {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  const variantStyles = {
    primary: 'bg-gradient-to-r from-[#7C5CFF] to-[#4F8CFF]',
    gold: 'bg-gradient-to-r from-[#F5C451] to-[#E8A33D]',
    success: 'bg-gradient-to-r from-[#34D399] to-[#059669]',
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-[#94A3B8]">{label}</span>
          <span className="text-[#F1F5F9] font-mono">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-[#1C2540] rounded-full overflow-hidden border border-[#2A3556]/50 ${height}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${variantStyles[variant] || variantStyles.primary}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
