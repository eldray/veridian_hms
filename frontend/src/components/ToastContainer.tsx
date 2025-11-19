// src/components/ToastContainer.tsx - Better positioning
import { Toast } from './Toast';
import { useToastStore } from '../store/toastStore';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 right-3 z-50 space-y-2 max-w-xs">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}