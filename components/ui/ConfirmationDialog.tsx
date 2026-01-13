'use client';

import { useEffect } from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmationDialogProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: '⚠️',
      iconBg: 'bg-rose-100',
      iconText: 'text-rose-600',
      buttonBg: 'bg-rose-600 hover:bg-rose-700',
      buttonText: 'text-white',
    },
    warning: {
      icon: '⚡',
      iconBg: 'bg-orange-100',
      iconText: 'text-orange-600',
      buttonBg: 'bg-orange-600 hover:bg-orange-700',
      buttonText: 'text-white',
    },
    info: {
      icon: 'ℹ️',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      buttonText: 'text-white',
    },
  };

  const style = variantStyles[variant];

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        margin: '0',
        padding: '16px'
      }}
    >
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="p-6 pb-4">
          <div className={`w-12 h-12 rounded-full ${style.iconBg} flex items-center justify-center mb-4`}>
            <span className="text-2xl">{style.icon}</span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-heading font-bold text-charcoal-900 mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-sm text-charcoal-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="bg-cream-50 px-6 py-4 flex gap-3 rounded-b-3xl border-t-2 border-cream-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-full border-2 border-cream-300 bg-white text-charcoal-700 font-semibold hover:bg-cream-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-full font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${style.buttonBg} ${style.buttonText}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
