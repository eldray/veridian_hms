// src/components/InputDialog.tsx
// Themed replacement for window.prompt: collects one short piece of text.
import React, { useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';

export interface InputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  message?: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  confirmText?: string;
  cancelText?: string;
  /** When set, an empty value cannot be submitted and this explains why. */
  required?: boolean;
  maxLength?: number;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const InputDialog: React.FC<InputDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  message,
  label,
  placeholder,
  defaultValue = '',
  multiline = false,
  confirmText = 'Save',
  cancelText = 'Cancel',
  required = false,
  maxLength,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState(defaultValue);

  // Each open starts from the value the caller offered, not the previous answer.
  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = value.trim();
  const blockedByRequired = required && trimmed.length === 0;

  const submit = () => {
    if (blockedByRequired) return;
    onSubmit(trimmed);
  };

  const fieldClass =
    'w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors';
  const fieldStyle: React.CSSProperties = {
    background: 'var(--bg-main)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="input-dialog-title"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--icon-cyan-bg)' }}
              >
                <Info className="w-6 h-6" style={{ color: 'var(--icon-cyan-text)' }} />
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-main)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3
              id="input-dialog-title"
              className="text-lg font-bold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h3>
            {message && (
              <p className="text-sm mb-4 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                {message}
              </p>
            )}

            <label
              htmlFor="input-dialog-field"
              className="block text-xs font-semibold uppercase mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              {label}
            </label>
            {multiline ? (
              <textarea
                id="input-dialog-field"
                ref={(el) => { inputRef.current = el; }}
                rows={4}
                value={value}
                placeholder={placeholder}
                maxLength={maxLength}
                onChange={(e) => setValue(e.target.value)}
                className={`${fieldClass} resize-y`}
                style={fieldStyle}
              />
            ) : (
              <input
                id="input-dialog-field"
                ref={(el) => { inputRef.current = el; }}
                type="text"
                value={value}
                placeholder={placeholder}
                maxLength={maxLength}
                onChange={(e) => setValue(e.target.value)}
                className={fieldClass}
                style={fieldStyle}
              />
            )}
            {required && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--icon-red-text)' }}>
                Required
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border"
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
                type="submit"
                disabled={blockedByRequired}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: 'var(--icon-cyan-text)', color: '#fff' }}
              >
                {confirmText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
