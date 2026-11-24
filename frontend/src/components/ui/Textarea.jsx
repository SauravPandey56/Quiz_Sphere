import React from 'react';

/**
 * Reusable Textarea component with label, error message, and helper text.
 */
export const Textarea = React.forwardRef(({
  label = '',
  error = '',
  helperText = '',
  className = '',
  id,
  rows = 3,
  disabled = false,
  required = false,
  ...props
}, ref) => {
  const generatedId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={generatedId}
          className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider pl-0.5"
        >
          {label} {required && <span className="text-[#FB7185]">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={generatedId}
        rows={rows}
        disabled={disabled}
        required={required}
        className={`w-full bg-[#1C2540]/60 text-[#F1F5F9] border rounded-[12px] p-3 text-sm transition-all duration-200 outline-none placeholder-[#64748B] resize-y focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/20 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-[#FB7185] focus:border-[#FB7185] focus:ring-[#FB7185]/20' : 'border-[#2A3556]'
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="text-xs text-[#FB7185] font-medium pl-0.5 animate-fadeIn">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#64748B] pl-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Textarea;
