// src/components/patients/DocumentsTab.tsx
import { FileArchive, Plus, Download } from 'lucide-react';

interface DocumentsTabProps {
  patient: any;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ patient }) => {
  return (
    <div className="text-center py-8">
      <FileArchive className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents</h3>
      <p className="text-gray-600 text-sm mb-4">No documents uploaded yet</p>
      <div className="flex items-center justify-center gap-2">
        <button className="inline-flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 font-semibold text-sm">
          <Plus className="w-3 h-3" />
          Upload
        </button>
        <button className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold text-sm">
          <Download className="w-3 h-3" />
          Template
        </button>
      </div>
    </div>
  );
};