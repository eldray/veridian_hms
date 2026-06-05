// src/pages/maternal/components/DeliveryTab.tsx
import React from 'react';
import { Hospital, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { SectionCard, EmptySlate, AddBtn, TD } from './TableComponents';

interface DeliveryTabProps {
  deliveries: any[];
  selectedAttendanceId: string;
  onAdd: () => void;
  onEdit: (delivery: any) => void;
  onDelete: (id: string) => void;
  onView: (delivery: any) => void;
}

export const DeliveryTab: React.FC<DeliveryTabProps> = ({
  deliveries,
  selectedAttendanceId,
  onAdd,
  onEdit,
  onDelete,
  onView,
}) => {
  const currentDeliveries = deliveries.filter(d => d.attendanceId === selectedAttendanceId);

  return (
    <div className="p-4">
      <SectionCard
        icon={<Hospital className="w-4 h-4 text-[var(--icon-green-text)]" />}
        title="Delivery Records"
        count={currentDeliveries.length}
        countCls="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
        action={<AddBtn onClick={onAdd} label="Add" />}
        maxH="max-h-[600px]"
      >
        {currentDeliveries.length === 0 ? (
          <EmptySlate
            icon={<Hospital className="w-9 h-9" />}
            label="No delivery records for this visit"
            action={<button onClick={onAdd} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white">Add Record</button>}
          />
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {currentDeliveries.map((d: any) => (
              <div key={d.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      Delivery — {new Date(d.deliveryDate).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
                        {d.deliveryType?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                        {d.deliveryOutcome?.replace(/_/g, ' ')}
                      </span>
                      {d.birthWeight && <span className="text-[10px] text-[var(--text-tertiary)]">Wt: {d.birthWeight}g</span>}
                      {d.gestationWeeks && <span className="text-[10px] text-[var(--text-tertiary)]">{d.gestationWeeks}wks</span>}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => onView(d)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)]">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onEdit(d)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)]">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(d.id)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)]">
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