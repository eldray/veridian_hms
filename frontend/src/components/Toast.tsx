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
  const timeoutRef = useRef<NodeJS.Timeout>();

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
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${styles[toast.type]} shadow-lg max-w-xs animate-in slide-in-from-right duration-300`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
        toast.type === 'success' ? 'text-green-600' :
        toast.type === 'error' ? 'text-red-600' :
        toast.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-xs opacity-90 mt-1 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}