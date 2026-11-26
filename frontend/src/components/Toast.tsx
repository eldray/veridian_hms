// src/components/Toast.tsx
import { useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

export function Toast({ toast, onRemove }: ToastProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only set timeout if duration > 0
    if (toast.duration && toast.duration > 0) {
      timeoutRef.current = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [toast.id, toast.duration, onRemove]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: AlertCircle,
  };

  const styles = {
    success: 'bg-[var(--icon-green-bg)] border-[var(--icon-green-text)] text-[var(--icon-green-text)]',
    error: 'bg-[var(--icon-red-bg)] border-[var(--icon-red-text)] text-[var(--icon-red-text)]',
    warning: 'bg-[var(--icon-yellow-bg)] border-[var(--icon-yellow-text)] text-[var(--icon-yellow-text)]',
    info: 'bg-[var(--icon-blue-bg)] border-[var(--icon-blue-text)] text-[var(--icon-blue-text)]',
  };

  const Icon = icons[toast.type];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${styles[toast.type]} shadow-xl w-full max-w-none animate-in slide-in-from-right duration-300`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
        toast.type === 'success' ? 'text-[var(--icon-green-text)]' :
        toast.type === 'error' ? 'text-[var(--icon-red-text)]' :
        toast.type === 'warning' ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--icon-blue-text)]'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-sm opacity-95 mt-1.5 leading-relaxed break-words">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 rounded-md p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}