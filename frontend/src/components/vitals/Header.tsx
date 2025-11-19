import React from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';

interface HeaderProps {
  onBack: () => void;
  showVisualization: boolean;
  onToggleVisualization: () => void;
  hasVitals: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onBack, 
  showVisualization, 
  onToggleVisualization, 
  hasVitals 
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <div className="w-12 h-12 bg-[var(--icon-red-bg)] rounded-xl flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-[var(--icon-red-text)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Vital Signs</h1>
          <p className="text-sm text-[var(--text-secondary)]">Record and monitor patient vital signs</p>
        </div>
      </div>
      
      {hasVitals && (
        <button
          onClick={onToggleVisualization}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
            showVisualization
              ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]'
              : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-main)]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          {showVisualization ? 'Hide Overview' : 'Show Overview'}
        </button>
      )}
    </div>
  );
};