// src/utils/pdfTemplates/leaveRequestFormPDF.ts
// Staff leave request / approval form. Built on printKit.
import {
  esc, orDash, human, multiline, fmtDate,
  resolveHospital, docTitle, section, signatures, note, kvGrid, pageShell,
} from './printKit';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  maternity: 'Maternity leave',
  paternity: 'Paternity leave',
  emergency: 'Emergency leave',
  unpaid: 'Unpaid leave',
};

export const generateLeaveRequestFormHTML = (leave: any, hospital: any): string => {
  const h = resolveHospital(hospital);
  const u = leave?.user || {};
  const status = String(leave?.status || 'pending');
  const type = LEAVE_TYPE_LABELS[leave?.leaveType] || human(leave?.leaveType || 'leave');
  const approver = leave?.approvedBy?.fullName || leave?.approver?.fullName || '';
  const approverReg = leave?.approvedBy?.licenseNumber || leave?.approver?.licenseNumber || '';
  const ref = leave?.id ? `LV-${String(leave.id).slice(-8).toUpperCase()}` : '';

  const body = `
    ${docTitle('Leave request form', { ref, refLabel: 'Request no.', date: leave?.createdAt || leave?.startDate, dateLabel: 'Requested', status: status.toUpperCase() })}

    ${section('Staff member', kvGrid(
      [
        ['Name', `<b>${esc(u.fullName || '')}</b>`],
        ['Staff ID / username', orDash(u.username)],
        ['Designation', orDash(u.role ? human(u.role) : '')],
        ['Department / unit', orDash(u.department?.name)],
      ],
      4,
    ), { keepTogether: true })}

    ${section('Leave requested', kvGrid(
      [
        ['Type of leave', `<b>${esc(type)}</b>`],
        ['First day of leave', esc(fmtDate(leave?.startDate))],
        ['Last day of leave', esc(fmtDate(leave?.endDate))],
        ['Working days', `<b>${esc(leave?.totalDays ?? '')}</b>`],
      ],
      4,
    ), { keepTogether: true })}

    ${section('Reason', `<div class="text-block">${leave?.reason ? multiline(leave.reason) : '<span class="muted">Not stated.</span>'}</div>`, { keepTogether: true })}

    ${section('Handover and contact during leave', kvGrid(
      [
        ['Duties handed over to', '&nbsp;'],
        ['Contact address / phone during leave', '&nbsp;'],
      ],
      2,
    ), { keepTogether: true })}

    ${section('Decision', kvGrid(
      [
        ['Status', `<b>${esc(status.toUpperCase())}</b>`],
        ['Decided by', orDash(approver)],
        ['Decision date', leave?.approvedAt ? esc(fmtDate(leave.approvedAt)) : '&nbsp;'],
        ['Comments', '&nbsp;'],
      ],
      4,
    ), { keepTogether: true })}

    ${note('Leave begins only when approved in writing by the head of department and recorded by Human Resources. Staff returning from sick leave should present a medical certificate.')}

    ${signatures([
      { role: 'Staff member', name: u.fullName, plain: true },
      { role: 'Head of department', name: approver, regNo: approverReg },
      { role: 'Human Resources / Administrator', plain: true },
    ])}
  `;

  return pageShell({
    title: `Leave request ${u.fullName || ''}`.trim(),
    hospital: h,
    body,
    footerRef: ref ? `Leave ${ref}` : undefined,
    printLabel: 'Print leave form',
    footerNote: 'Confidential staff record',
  });
};
