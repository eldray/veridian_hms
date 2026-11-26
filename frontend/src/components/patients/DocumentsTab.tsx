// src/components/patients/DocumentsTab.tsx
import { FileArchive, Plus, Download } from 'lucide-react';

interface DocumentsTabProps {
  patient: any;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ patient }) => {
  return (
    <div className="text-center py-8">
      <FileArchive className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Documents</h3>
      <p className="text-[var(--text-secondary)] text-sm mb-4">No documents uploaded yet</p>
      <div className="flex items-center justify-center gap-2">
        <button className="inline-flex items-center gap-1 px-3 py-2 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 transition-all duration-200 font-semibold text-sm">
          <Plus className="w-3 h-3" />
          Upload
        </button>
        <button className="inline-flex items-center gap-1 px-3 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all duration-200 font-semibold text-sm">
          <Download className="w-3 h-3" />
          Template
        </button>
      </div>
    </div>
  );
};