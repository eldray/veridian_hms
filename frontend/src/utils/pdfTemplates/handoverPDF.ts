// src/utils/pdfTemplates/handoverPDF.ts
// Nursing shift handover report. Built on printKit.
import {
  esc, orDash, multiline, fmtDate, fmtTime, fmtDateTime,
  resolveHospital, docTitle, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

export interface HandoverPDFData {
  shiftFrom: string;
  shiftTo: string;
  handoverNotes: string;
  completedTasksCount: number;
  patients: Array<{
    name: string;
    bedNumber?: string;
    pendingTasks: Array<{
      title: string;
      priority: string;
      scheduledTime?: Date | string;
    }>;
    completedTasks: Array<any>;
  }>;
  handedOverBy: string;
  handedOverAt: string;
}

const PRIORITY_RANK: Record<string, number> = { stat: 0, urgent: 1, high: 2, medium: 3, low: 4 };

export const generateHandoverHTML = (data: HandoverPDFData, hospital: any): string => {
  const h = resolveHospital(hospital);
  const patients = Array.isArray(data?.patients) ? data.patients : [];
  const pending = patients.reduce((s, p) => s + (p.pendingTasks?.length || 0), 0);
  const completed = data?.completedTasksCount ?? patients.reduce((s, p) => s + (p.completedTasks?.length || 0), 0);
  const at = data?.handedOverAt || new Date().toISOString();

  const prio = (p?: string) => {
    const k = String(p || 'medium').toLowerCase();
    const label = k.toUpperCase();
    return k === 'stat' || k === 'urgent' || k === 'high' ? `<b class="flag-c">${esc(label)}</b>` : esc(label);
  };

  const rows = patients.map((p) => {
    const tasks = [...(p.pendingTasks || [])].sort(
      (a, b) => (PRIORITY_RANK[String(a.priority).toLowerCase()] ?? 3) - (PRIORITY_RANK[String(b.priority).toLowerCase()] ?? 3),
    );
    const taskHtml = tasks.length
      ? tasks
          .map((t) => `<div>${esc(t.title)} <span class="muted">· ${t.scheduledTime ? esc(fmtTime(t.scheduledTime)) : 'unscheduled'} ·</span> ${prio(t.priority)}</div>`)
          .join('')
      : '<span class="muted">No outstanding tasks</span>';
    return [orDash(p.bedNumber), `<b>${esc(p.name)}</b>`, taskHtml, String(p.completedTasks?.length || 0)];
  });

  const body = `
    ${docTitle('Nursing shift handover', { ref: '', date: at, dateLabel: 'Handed over' })}

    ${section(
      'Shift',
      kvGrid(
        [
          ['Handing over (from)', `<b>${esc(data?.shiftFrom || '')}</b>`],
          ['Taking over (to)', `<b>${esc(data?.shiftTo || '')}</b>`],
          ['Handed over by', orDash(data?.handedOverBy)],
          ['Time', esc(fmtDateTime(at))],
          ['Patients', String(patients.length)],
          ['Outstanding tasks', pending ? `<b class="flag-c">${pending}</b>` : '0'],
          ['Tasks completed', String(completed)],
          ['Date', esc(fmtDate(at))],
        ],
        4,
      ),
      { keepTogether: true },
    )}

    ${section(
      'Patients and outstanding tasks',
      table({
        head: ['Bed', 'Patient', 'Outstanding tasks (most urgent first)', 'Done'],
        widths: ['8%', '24%', '58%', '10%'],
        align: [undefined, undefined, undefined, 'c'],
        rows,
        empty: 'No patients on this handover',
      }),
    )}

    ${section('Handover notes', `<div class="text-block">${data?.handoverNotes ? multiline(data.handoverNotes) : '<span class="muted">No additional notes.</span>'}</div>`)}

    ${note('The incoming nurse confirms that the patients, tasks and notes above were handed over and understood. Check each patient\'s identity band against this list at the bedside.')}

    ${signatures([
      { role: 'Outgoing nurse', name: data?.handedOverBy, date: at },
      { role: 'Incoming nurse' },
    ])}
  `;

  return pageShell({
    title: 'Nursing shift handover',
    hospital: h,
    body,
    footerRef: `Handover ${fmtDate(at)}`,
    printLabel: 'Print handover',
  });
};
