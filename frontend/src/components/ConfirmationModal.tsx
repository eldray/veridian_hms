// src/components/ConfirmationModal.tsx
import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Escape to close + focus trap + restore focus
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Focus the cancel button on open (safest default action)
    const focusTimer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const nodes = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((n) => !n.hasAttribute('inert'));

      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6" style={{ color: 'var(--icon-red-text)' }} />,
          confirmBg: 'var(--icon-red-text)',
          iconBg: 'var(--icon-red-bg)',
          iconColor: 'var(--icon-red-text)',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6" style={{ color: 'var(--icon-yellow-text)' }} />,
          confirmBg: 'var(--icon-yellow-text)',
          iconBg: 'var(--icon-yellow-bg)',
          iconColor: 'var(--icon-yellow-text)',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6" style={{ color: 'var(--icon-green-text)' }} />,
          confirmBg: 'var(--icon-green-text)',
          iconBg: 'var(--icon-green-bg)',
          iconColor: 'var(--icon-green-text)',
        };
      default:
        return {
          icon: <Info className="w-6 h-6" style={{ color: 'var(--icon-cyan-text)' }} />,
          confirmBg: 'var(--icon-cyan-text)',
          iconBg: 'var(--icon-cyan-bg)',
          iconColor: 'var(--icon-cyan-text)',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-message"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          className="relative rounded-2xl shadow-2xl max-w-md w-full border"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: styles.iconBg }}
              >
                {styles.icon}
              </div>
              <button
                onClick={onClose}
                disabled={isLoading}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-main)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3
              id="confirmation-modal-title"
              className="text-lg font-bold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h3>
            <p
              id="confirmation-modal-message"
              className="text-sm mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              {message}
            </p>

            <div className="flex gap-3">
              <button
                ref={cancelButtonRef}
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border disabled:opacity-50"
                style={{
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-main)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: styles.confirmBg, color: '#fff' }}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};