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
      className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
        message.type === 'success'
          ? 'bg-green-50 text-green-800 border-green-200'
          : 'bg-red-50 text-red-800 border-red-200'
      }`}
    >
      {message.type === 'success' ? (
        <CheckCircle2 className="w-5 h-5" />
      ) : (
        <AlertCircle className="w-5 h-5" />
      )}
      <span className="font-medium">{message.text}</span>
    </div>
  );
};