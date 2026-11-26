import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface MessageDisplayProps {
  message: {
    type: 'success' | 'error';
    text: string;
  } | null;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      className={`mb-4 p-3 rounded-lg flex items-center gap-3 border ${
        message.type === 'success'
          ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-text)]'
          : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]'
      }`}
    >
      {message.type === 'success' ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-5 h-5" />
      )}
      <span className="font-medium text-sm">{message.text}</span>
    </div>
  );
};