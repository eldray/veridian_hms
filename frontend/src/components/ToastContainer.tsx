// src/components/ToastContainer.tsx - Better positioning
import { Toast } from './Toast';
import { useToastStore } from '../store/toastStore';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[calc(52px+12px)] right-3 z-[100] flex max-h-[calc(100vh-76px)] w-[min(26rem,calc(100vw-1.5rem))] flex-col gap-3 overflow-y-auto overscroll-contain px-1 pb-1">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}