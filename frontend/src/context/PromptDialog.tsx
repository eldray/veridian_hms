import React, { useEffect, useRef, useState } from 'react';
import { InputDialog } from '../components/InputDialog';

export interface PromptOptions {
  title?: string;
  message?: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  maxLength?: number;
}

type PromptHandler = (options: PromptOptions) => Promise<string | null>;

// One dialog is mounted at the application root. Call sites await
// promptDialog(...) instead of window.prompt so a reason or an amount is typed
// into the themed dialog the rest of the app uses.
let activeHandler: PromptHandler | null = null;

/** The typed text, or `null` when the operator closes the dialog without answering. */
export function promptDialog(options: PromptOptions): Promise<string | null> {
  if (!activeHandler) return Promise.resolve(window.prompt(options.label));
  return activeHandler(options);
}

export const PromptDialogHost: React.FC = () => {
  const [pending, setPending] = useState<PromptOptions | null>(null);
  const resolver = useRef<((value: string | null) => void) | null>(null);

  useEffect(() => {
    const handler: PromptHandler = (options) => {
      resolver.current?.(null);
      return new Promise<string | null>((resolve) => {
        resolver.current = resolve;
        setPending(options);
      });
    };

    activeHandler = handler;
    return () => {
      if (activeHandler === handler) activeHandler = null;
      resolver.current?.(null);
      resolver.current = null;
    };
  }, []);

  const settle = (value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setPending(null);
  };

  return (
    <InputDialog
      isOpen={pending !== null}
      onClose={() => settle(null)}
      onSubmit={(value) => settle(value)}
      title={pending?.title || 'Please enter'}
      message={pending?.message}
      label={pending?.label || 'Value'}
      placeholder={pending?.placeholder}
      defaultValue={pending?.defaultValue}
      multiline={pending?.multiline}
      confirmText={pending?.confirmText}
      cancelText={pending?.cancelText}
      required={pending?.required}
      maxLength={pending?.maxLength}
    />
  );
};
