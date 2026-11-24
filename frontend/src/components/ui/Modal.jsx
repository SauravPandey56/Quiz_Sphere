import React, { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

/**
 * Reusable accessible Modal dialog rendered in a React portal.
 * Respects Escape key, overlay dismissal, and scroll lock.
 */
export const Modal = ({
  isOpen = false,
  onClose,
  title = '',
  description = '',
  children,
  footer = null,
  maxWidth = 'max-w-lg',
  closeOnOverlayClick = true,
}) => {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0B1020]/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={`w-full ${maxWidth} bg-[#131A2E] border border-[#2A3556] rounded-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#2A3556] bg-[#1C2540]/40 shrink-0">
          <div>
            {title && (
              <h2 className="text-lg font-bold text-[#F1F5F9] font-heading tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-[#94A3B8] mt-1 font-medium">
                {description}
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#94A3B8] hover:text-[#F1F5F9] p-1.5 rounded-[8px] hover:bg-[#1C2540] transition-colors -mr-2"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-[#F1F5F9]">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#2A3556] bg-[#1C2540]/30 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
