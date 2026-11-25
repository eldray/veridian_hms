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
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const Icon = icons[toast.type];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${styles[toast.type]} shadow-xl w-full max-w-none animate-in slide-in-from-right duration-300`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
        toast.type === 'success' ? 'text-green-600' :
        toast.type === 'error' ? 'text-red-600' :
        toast.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-sm opacity-95 mt-1.5 leading-relaxed break-words">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 rounded-md p-1 text-gray-500 hover:text-gray-800 hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}