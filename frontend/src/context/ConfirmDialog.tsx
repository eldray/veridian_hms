import React, { useEffect, useRef, useState } from 'react';
import { ConfirmationModal } from '../components/ConfirmationModal';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

type ConfirmHandler = (options: ConfirmOptions) => Promise<boolean>;

// A single modal is mounted at the application root. Call sites await
// confirmDialog(...) instead of window.confirm so destructive actions use the
// themed, keyboard-accessible dialog and can show pending state later.
let activeHandler: ConfirmHandler | null = null;

export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const normalized = typeof options === 'string' ? { message: options } : options;
  if (!activeHandler) return Promise.resolve(window.confirm(normalized.message));
  return activeHandler(normalized);
}

export const ConfirmDialogHost: React.FC = () => {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    const handler: ConfirmHandler = (options) => {
      resolver.current?.(false);
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setPending(options);
      });
    };

    activeHandler = handler;
    return () => {
      if (activeHandler === handler) activeHandler = null;
      resolver.current?.(false);
      resolver.current = null;
    };
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setPending(null);
  };

  return (
    <ConfirmationModal
      isOpen={pending !== null}
      onClose={() => settle(false)}
      onConfirm={() => settle(true)}
      title={pending?.title || 'Please confirm'}
      message={pending?.message || ''}
      confirmText={pending?.confirmText}
      cancelText={pending?.cancelText}
      type={pending?.type || 'warning'}
    />
  );
};
