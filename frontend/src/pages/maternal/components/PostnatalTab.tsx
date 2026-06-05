// src/pages/maternal/components/PostnatalTab.tsx
import React from 'react';
import { Heart, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { SectionCard, EmptySlate, AddBtn } from './TableComponents';

interface PostnatalTabProps {
  postnatalRecords: any[];
  selectedAttendanceId: string;
  onAdd: () => void;
  onEdit: (record: any) => void;
  onDelete: (id: string) => void;
  onView: (record: any) => void;
}

export const PostnatalTab: React.FC<PostnatalTabProps> = ({
  postnatalRecords,
  selectedAttendanceId,
  onAdd,
  onEdit,
  onDelete,
  onView,
}) => {
  const currentRecords = postnatalRecords.filter(p => p.attendanceId === selectedAttendanceId);

  return (
    <div className="p-4">
      <SectionCard
        icon={<Heart className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
        title="Postnatal Examinations"
        count={currentRecords.length}
        action={<AddBtn onClick={onAdd} label="Add" />}
        maxH="max-h-[600px]"
      >
        {currentRecords.length === 0 ? (
          <EmptySlate
            icon={<Heart className="w-9 h-9" />}
            label="No postnatal examinations for this visit"
            action={<button onClick={onAdd} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white">Add Exam</button>}
          />
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {currentRecords.map((pn: any) => (
              <div key={pn.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary)]">Postnatal Day {pn.dayNumber}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{new Date(pn.examinationDate).toLocaleString()}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pn.maternalCondition === 'good' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : pn.maternalCondition === 'fair' ? 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'}`}>
                        Maternal: {pn.maternalCondition}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pn.breastfeedingStatus === 'exclusive' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]'}`}>
                        BF: {pn.breastfeedingStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => onView(pn)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)]">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onEdit(pn)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)]">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(pn.id)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)]">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};