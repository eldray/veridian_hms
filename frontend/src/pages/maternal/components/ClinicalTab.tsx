// src/pages/maternal/components/ClinicalTab.tsx
import React from 'react';
import { Stethoscope, Scissors, FlaskConical, Pill, CheckCircle, Scan, Plus, Trash2, Edit, Eye } from 'lucide-react';
import { SectionCard, EmptySlate, AddBtn, DelBtn, StatusBadge, TD, TDp, TH } from './TableComponents';

interface ClinicalTabProps {
  attendanceId: string;
  canAddEntries: boolean;
  diagnosesList: any[];
  labTestsList: any[];
  proceduresList: any[];
  medicationsList: any[];
  scansList: any[];
  onAddItem: (type: string) => void;
  onDeleteItem: (type: string, id: string) => void;
}

export const ClinicalTab: React.FC<ClinicalTabProps> = ({
  canAddEntries,
  diagnosesList,
  labTestsList,
  proceduresList,
  medicationsList,
  scansList,
  onAddItem,
  onDeleteItem,
}) => {
  const prescribedMeds = medicationsList.filter((m: any) => m.status === 'prescribed');
  const dispensedMeds = medicationsList.filter((m: any) => m.status === 'dispensed');
  const requestedScans = scansList.filter((s: any) => s.status === 'requested' || s.status === 'scheduled');
  const completedScans = scansList.filter((s: any) => s.status === 'completed');
  const completedLabs = labTestsList.filter((t: any) => t.status === 'completed');

  return (
    <div className="p-4 space-y-4">
      {/* Diagnosis & Procedures Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          icon={<Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
          title="Diagnosis (ICD-10)" count={diagnosesList.length}
          action={canAddEntries && <AddBtn onClick={() => onAddItem('diagnosis')} label="Add" />}
        >
          {diagnosesList.length === 0 ? (
            <EmptySlate icon={<Stethoscope className="w-9 h-9" />} label="No diagnoses added" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr><TH>Diagnosis</TH><TH>ICD-10</TH><TH>Type</TH><TH>By</TH><TH></TH></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {diagnosesList.map((item: any) => {
                  const typeConfig: Record<string, { label: string; cls: string }> = {
                    provisional: { label: 'Provisional', cls: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' },
                    primary: { label: 'Primary', cls: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' },
                    additional: { label: 'Additional', cls: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' },
                  };
                  const cfg = typeConfig[item.diagnosisType] ?? typeConfig.additional;
                  return (
                    <tr key={item.id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <TDp>{item.Diagnosis?.name}{item.notes && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{item.notes}</p>}</TDp>
                      <TD className="font-mono">{item.Diagnosis?.icdCode || '—'}</TD>
                      <TD><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>{cfg.label}</span></TD>
                      <TD>{item.createdBy?.fullName || '—'}</TD>
                      <TD>{canAddEntries && <DelBtn onClick={() => onDeleteItem('diagnosis', item.id)} />}</TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard
          icon={<Scissors className="w-4 h-4 text-[var(--icon-orange-text)]" />}
          title="Procedures" count={proceduresList.length}
          countCls="bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]"
          action={canAddEntries && <AddBtn onClick={() => onAddItem('procedure')} label="Schedule" />}
        >
          {proceduresList.length === 0 ? (
            <EmptySlate icon={<Scissors className="w-8 h-8" />} label="No procedures scheduled" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr><TH>Procedure</TH><TH>Scheduled</TH><TH>Status</TH><TH></TH></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {proceduresList.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TDp>{p.ServiceCatalog?.name || p.name}</TDp>
                    <TD>{p.scheduledDate ? new Date(p.scheduledDate).toLocaleString() : '—'}</TD>
                    <TD><StatusBadge status={p.status} /></TD>
                    <TD>{canAddEntries && p.status === 'scheduled' && <DelBtn onClick={() => onDeleteItem('procedure', p.id)} />}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      {/* Lab Tests & Results Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          icon={<FlaskConical className="w-4 h-4 text-[var(--icon-purple-text)]" />}
          title="Investigations" count={labTestsList.length}
          countCls="bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]"
          action={canAddEntries && <AddBtn onClick={() => onAddItem('lab')} label="Request" />}
        >
          {labTestsList.length === 0 ? (
            <EmptySlate icon={<FlaskConical className="w-8 h-8" />} label="No lab tests requested" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr><TH>Test</TH><TH>Priority</TH><TH>Status</TH><TH>Date</TH><TH></TH></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {labTestsList.map((t: any) => (
                  <tr key={t.id} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TDp>{t.ServiceCatalog?.name || t.name}</TDp>
                    <TD><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      t.priority === 'stat' ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'
                      : t.priority === 'urgent' ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]'
                      : 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'}`}>{t.priority || 'routine'}</span></TD>
                    <TD><StatusBadge status={t.status} /></TD>
                    <TD>{t.requestedAt ? new Date(t.requestedAt).toLocaleDateString() : '—'}</TD>
                    <TD>{canAddEntries && t.status === 'requested' && <DelBtn onClick={() => onDeleteItem('lab', t.id)} />}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard
          icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
          title="Investigation Results" count={completedLabs.length}
          countCls="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
        >
          {completedLabs.length === 0 ? (
            <EmptySlate icon={<FlaskConical className="w-8 h-8" />} label="No results yet" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr><TH>Test</TH><TH>Result</TH><TH>Flag</TH><TH>Date</TH></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {completedLabs.map((test: any) => {
                  const val = typeof test.result === 'object' ? (test.result?.value ?? '—') : (test.result ?? '—');
                  const abn = test.abnormal || String(val).toLowerCase() === 'positive';
                  const flag = String(val).toLowerCase() === 'positive' ? 'POS' : String(val).toLowerCase() === 'negative' ? 'NEG' : abn ? 'ABN' : 'NL';
                  const flagCls = flag === 'POS' || abn ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
                  return (
                    <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <TDp>{test.ServiceCatalog?.name || test.name}</TDp>
                      <TD className={`font-mono ${abn ? 'font-bold text-[var(--icon-red-text)]' : ''}`}>{String(val)}</TD>
                      <TD><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${flagCls}`}>{flag}</span></TD>
                      <TD>{test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '—'}</TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      {/* Prescribed & Dispensed Medications Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          icon={<Pill className="w-4 h-4 text-[var(--icon-green-text)]" />}
          title="Prescribed" count={prescribedMeds.length}
          countCls="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
          action={canAddEntries && <AddBtn onClick={() => onAddItem('medication')} label="Prescribe" />}
        >
          {prescribedMeds.length === 0 ? (
            <EmptySlate icon={<Pill className="w-8 h-8" />} label="No medications prescribed" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr><TH>Medication</TH><TH>Dosage</TH><TH>Freq.</TH><TH>Status</TH><TH></TH></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {prescribedMeds.map((m: any) => (
                  <tr key={m.id} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TDp>{m.name}</TDp><TD>{m.dosage || '—'}</TD><TD>{m.frequency || '—'}</TD>
                    <TD><StatusBadge status={m.status} /></TD>
                    <TD>{canAddEntries && <DelBtn onClick={() => onDeleteItem('medication', m.id)} />}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard
          icon={<CheckCircle className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
          title="Dispensed" count={dispensedMeds.length}
        >
          {dispensedMeds.length === 0 ? (
            <EmptySlate icon={<CheckCircle className="w-8 h-8" />} label="No medications dispensed yet" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr><TH>Medication</TH><TH>Qty</TH><TH>Total</TH><TH>Date</TH></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {dispensedMeds.map((m: any) => (
                  <tr key={m.id} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TDp>{m.name}</TDp><TD>{m.quantity}</TD>
                    <TD>GHS {((m.unitCost || 0) * m.quantity).toFixed(2)}</TD>
                    <TD>{m.dispensedAt ? new Date(m.dispensedAt).toLocaleDateString() : '—'}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      {/* Scans Requested & Results Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          icon={<Scan className="w-4 h-4 text-[var(--icon-purple-text)]" />}
          title="Scans Requested" count={requestedScans.length}
          countCls="bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]"
          action={canAddEntries && <AddBtn onClick={() => onAddItem('scan')} label="Request" />}
        >
          {requestedScans.length === 0 ? (
            <EmptySlate icon={<Scan className="w-8 h-8" />} label="No scans requested" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr><TH>Scan</TH><TH>Body Part</TH><TH>Status</TH><TH>Date</TH><TH></TH></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {requestedScans.map((s: any) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TDp>{s.scanType || s.ServiceCatalog?.name}</TDp><TD>{s.bodyPart || '—'}</TD>
                    <TD><StatusBadge status={s.status} /></TD>
                    <TD>{new Date(s.requestedAt).toLocaleDateString()}</TD>
                    <TD>{canAddEntries && (s.status === 'requested' || s.status === 'scheduled') && <DelBtn onClick={() => onDeleteItem('scan', s.id)} />}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard
          icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
          title="Scan Results" count={completedScans.length}
          countCls="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
        >
          {completedScans.length === 0 ? (
            <EmptySlate icon={<Scan className="w-8 h-8" />} label="No scan results yet" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr><TH>Scan</TH><TH>Findings</TH><TH>Completed</TH></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {completedScans.map((s: any) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-main)] transition-colors">
                    <TDp>{s.scanType || s.ServiceCatalog?.name}{s.bodyPart && <p className="text-[10px] text-[var(--text-tertiary)]">{s.bodyPart}</p>}</TDp>
                    <TD className="max-w-[160px] truncate">{s.findings || '—'}</TD>
                    <TD>{s.completedAt ? new Date(s.completedAt).toLocaleDateString() : '—'}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
    </div>
  );
};