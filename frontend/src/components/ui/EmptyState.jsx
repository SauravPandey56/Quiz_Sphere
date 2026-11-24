import React from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Reusable EmptyState component with icon, heading, description, and optional action.
 */
export const EmptyState = ({
  icon: Icon = HelpCircle,
  title = 'No items found',
  description = 'There is no data to display right now.',
  action = null,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-[16px] border border-dashed border-[#2A3556] bg-[#131A2E]/50 ${className}`}>
      <div className="w-14 h-14 rounded-[14px] bg-[#1C2540] border border-[#2A3556] text-[#7C5CFF] flex items-center justify-center mb-4 shadow-sm">
        <Icon size={28} />
      </div>
      <h3 className="text-base font-bold text-[#F1F5F9] font-heading mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-[#94A3B8] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
