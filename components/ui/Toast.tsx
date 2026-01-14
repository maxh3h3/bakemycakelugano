/**
 * Toast Notification Component
 * 
 * Displays temporary notification messages with automatic dismissal.
 * Used for showing production updates, success messages, etc.
 * 
 * Features:
 * - Auto-dismiss after specified duration
 * - Slide-in animation
 * - Multiple variants (info, success, warning, error)
 * - Manual close button
 */

'use client';

import { useEffect, useState } from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number; // milliseconds
  onClose?: () => void;
  show?: boolean;
}

const variantStyles: Record<ToastVariant, string> = {
  info: 'bg-blue-500 text-white border-blue-600',
  success: 'bg-green-500 text-white border-green-600',
  warning: 'bg-orange-500 text-white border-orange-600',
  error: 'bg-red-500 text-white border-red-600',
};

const variantIcons: Record<ToastVariant, JSX.Element> = {
  info: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  success: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  error: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

export default function Toast({
  message,
  variant = 'info',
  duration = 3000,
  onClose,
  show = true,
}: ToastProps) {
  const [visible, setVisible] = useState(show);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setVisible(show);
    setIsExiting(false);
  }, [show]);

  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 300); // Match animation duration
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`
        fixed top-4 right-4 z-[100] 
        min-w-[300px] max-w-md 
        rounded-xl shadow-2xl border-2
        transform transition-all duration-300 ease-out
        ${isExiting 
          ? 'translate-x-[120%] opacity-0' 
          : 'translate-x-0 opacity-100'
        }
        ${variantStyles[variant]}
      `}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {variantIcons[variant]}
        </div>

        {/* Message */}
        <div className="flex-1 pt-0.5">
          <p className="font-medium leading-snug">{message}</p>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 hover:bg-white/20 rounded-lg p-1 transition-colors"
          aria-label="Close notification"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-1 bg-white/30 overflow-hidden rounded-b-xl">
          <div
            className="h-full bg-white/50 animate-toast-progress"
            style={{
              animationDuration: `${duration}ms`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Toast Container Component
 * 
 * Manages multiple toast notifications with stacking
 */
interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    variant?: ToastVariant;
    duration?: number;
  }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            transform: `translateY(${index * 8}px)`,
            transition: 'transform 300ms ease-out',
          }}
        >
          <Toast
            message={toast.message}
            variant={toast.variant}
            duration={toast.duration}
            onClose={() => onRemove(toast.id)}
            show={true}
          />
        </div>
      ))}
    </div>
  );
}
