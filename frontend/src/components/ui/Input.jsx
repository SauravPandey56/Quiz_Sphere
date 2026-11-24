import React from 'react';

/**
 * Reusable Input component with label, error message, helper text, and prefix icon.
 */
export const Input = React.forwardRef(({
  label = '',
  error = '',
  helperText = '',
  icon: Icon = null,
  rightElement = null,
  className = '',
  id,
  type = 'text',
  disabled = false,
  required = false,
  ...props
}, ref) => {
  const generatedId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

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

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-[#94A3B8] pointer-events-none flex items-center justify-center">
            <Icon size={18} />
          </div>
        )}

        <input
          ref={ref}
          id={generatedId}
          type={type}
          disabled={disabled}
          required={required}
          className={`w-full bg-[#1C2540]/60 text-[#F1F5F9] border rounded-[12px] py-2.5 text-sm transition-all duration-200 outline-none placeholder-[#64748B] focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/20 disabled:opacity-50 disabled:cursor-not-allowed ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${rightElement ? 'pr-11' : 'pr-3.5'} ${
            error ? 'border-[#FB7185] focus:border-[#FB7185] focus:ring-[#FB7185]/20' : 'border-[#2A3556]'
          } ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3.5 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-[#FB7185] font-medium pl-0.5 animate-fadeIn">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#64748B] pl-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
