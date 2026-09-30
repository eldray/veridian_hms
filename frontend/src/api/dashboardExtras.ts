// src/api/dashboardExtras.ts
// Aggregates role-specific dashboard data from existing API endpoints.

import {
  // Nursing
  getMarDoses,
  getNursingTasks,
  getNursingNotes,
} from './nursing';

import {
  // Core
  getEncounters,
  getLabReport,
  getScanReport,
  getExpiryReport,
  getLowStockItems,
  getBills,
  getInsuranceClaims,
  getWaivers,
  getExpiringEstimates,
  getCorporateStatistics,
  getLeaves,
  getShifts,
  getAllUsers,
  getAppointments,
  getReferrals,
  getAntenatalStatistics,
  getPostnatalStatistics,
  getDeliveryStatistics,
  getMedicalWorklist,
  getLabWorklist,
  getPatients,
  getAntenatalRecords,
} from './index';

// ── helpers ─────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    const r = await fn();
    return r ?? fallback;
  } catch {
    return fallback;
  }
};

const arrayOf = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.doses)) return v.doses;
  if (Array.isArray(v?.tasks)) return v.tasks;
  if (Array.isArray(v?.notes)) return v.notes;
  return [];
};

// ── NURSE ───────────────────────────────────────

export async function fetchNurseExtras() {
  const [dueRes, lateRes, missedRes, tasksRes, notesRes, admRes] = await Promise.all([
    safe(() => getMarDoses({ status: 'due', limit: 200 }), { doses: [] } as any),
    safe(() => getMarDoses({ status: 'late', limit: 200 }), { doses: [] } as any),
    safe(() => getMarDoses({ status: 'missed', limit: 200 }), { doses: [] } as any),
    safe(() => getNursingTasks({ status: ['pending', 'in_progress'], limit: 200 }), { tasks: [] } as any),
    safe(() => getNursingNotes({ isFlagged: true, limit: 100 }), { notes: [] } as any),
    safe(() => getEncounters({ status: 'admitted', limit: 200 }), { data: [] } as any),
  ]);

  const admitted = arrayOf(admRes);
  const vitalsOverdue = admitted.filter((a: any) => {
    const last = a.lastVitalsAt || a.Vitals?.[0]?.recordedAt;
    if (!last) return true;
    const diff = Date.now() - new Date(last).getTime();
    return diff > 8 * 60 * 60 * 1000;
  }).length;

  return {
    medsDue: arrayOf(dueRes).length,
    medsLate: arrayOf(lateRes).length,
    medsMissed: arrayOf(missedRes).length,
    pendingNursingTasks: arrayOf(tasksRes).length,
    flaggedNotes: arrayOf(notesRes).length,
    vitalsOverdue,
  };
}

// ── LAB ─────────────────────────────────────────

export async function fetchLabExtras() {
  const [reportRes, worklistRes] = await Promise.all([
    safe(() => getLabReport({ startDate: today(), endDate: today() }), null as any),
    safe(() => getLabWorklist(), null as any),
  ]);

  const report = reportRes?.data ?? reportRes;
  const summary = report?.summary ?? {};

  const criticalLabs = report?.criticalResults ?? summary.criticalResults ?? 0;
  const pendingLabTests = summary?.byStatus?.pending ?? summary?.byStatus?.inProgress ?? 0;
  const labSlaBreaches = summary?.slaBreaches ?? report?.slaBreaches ?? 0;

  const worklistLen = arrayOf(worklistRes).length;

  return {
    criticalLabs,
    pendingLabTests: pendingLabTests || worklistLen,
    labSlaBreaches,
  };
}

// ── SCANS ───────────────────────────────────────

export async function fetchScanExtras() {
  const reportRes = await safe(
    () => getScanReport({ startDate: today(), endDate: today() }),
    null as any
  );
  const report = reportRes?.data ?? reportRes;
  const summary = report?.summary ?? {};

  return {
    criticalScans: report?.criticalFindings ?? summary.criticalFindings ?? 0,
    pendingRadiologistReview:
      report?.pendingRadiologistReview ?? summary.pendingRadiologistReview ?? 0,
  };
}

// ── PHARMACY / STOCK ────────────────────────────

export async function fetchPharmacyExtras() {
  const [expRes, lowRes] = await Promise.all([
    safe(() => getExpiryReport(30), null as any),
    safe(() => getLowStockItems(), null as any),
  ]);

  return {
    expiringStock: arrayOf(expRes).length,
    lowStockItems: arrayOf(lowRes).length,
  };
}

// ── MATERNAL ────────────────────────────────────

export async function fetchMaternalExtras() {
  const [ancRes, pncRes, delRes] = await Promise.all([
    safe(() => getAntenatalStatistics({ startDate: today(), endDate: today() }), null as any),
    safe(() => getPostnatalStatistics({ startDate: today(), endDate: today() }), null as any),
    safe(() => getDeliveryStatistics({ startDate: today(), endDate: today() }), null as any),
  ]);

  const anc = ancRes?.data ?? ancRes ?? {};
  const pnc = pncRes?.data ?? pncRes ?? {};
  const del = delRes?.data ?? delRes ?? {};

  const eddThisWeek = anc?.eddThisWeek ?? anc?.upcomingDeliveries ?? 0;

  return {
    highRiskANC: anc?.byRiskLevel?.high ?? anc?.highRisk ?? 0,
    overdueANC: anc?.overdueANC ?? anc?.missed ?? 0,
    pncDueToday: pnc?.dueToday ?? pnc?.todayVisits ?? 0,
    deliveriesThisWeek: eddThisWeek,
  };
}

// ── ACCOUNTS ────────────────────────────────────

export async function fetchAccountsExtras() {
  const [billsRes, claimsRes, waiversRes, estimatesRes, corporateRes] = await Promise.all([
    safe(() => getBills({ startDate: today(), endDate: today() }), [] as any),
    safe(() => getInsuranceClaims({ status: 'submitted' }), [] as any),
    safe(() => getWaivers({ status: 'pending' }), [] as any),
    safe(() => getExpiringEstimates(7), [] as any),
    safe(() => getCorporateStatistics(), null as any),
  ]);

  const bills = arrayOf(billsRes);
  const todayCollections = bills.reduce(
    (sum: number, b: any) => sum + (b.paidAmount || 0),
    0
  );

  const corp = corporateRes?.data ?? corporateRes ?? {};

  return {
    todayCollections,
    outstandingClaims: arrayOf(claimsRes).length,
    pendingWaivers: arrayOf(waiversRes).length,
    expiringEstimates: arrayOf(estimatesRes).length,
    corporateOutstanding: corp?.totalOutstanding ?? corp?.outstanding ?? 0,
  };
}

// ── DOCTOR ──────────────────────────────────────

export async function fetchDoctorExtras() {
  const [worklistRes, labRes] = await Promise.all([
    safe(() => getMedicalWorklist(), null as any),
    safe(() => getLabWorklist(), null as any),
  ]);

  const worklist = arrayOf(worklistRes);
  const waitingOver60 = worklist.filter((it: any) => (it.waitTime ?? 0) > 60).length;

  const labList = arrayOf(labRes);
  const resultsReadyForMe = labList.filter((t: any) => t.status === 'completed').length;

  return { waitingOver60, resultsReadyForMe };
}

// ── RECORDS ─────────────────────────────────────

export async function fetchRecordsExtras() {
  const [patsRes, apptsRes, refsRes] = await Promise.all([
    safe(() => getPatients({ createdFrom: today(), limit: 100 }), [] as any),
    safe(() => getAppointments({ date: today(), limit: 100 }), [] as any),
    safe(() => getReferrals({ status: 'pending', limit: 100 }), null as any),
  ]);

  const pats = arrayOf(patsRes);
  const appts = arrayOf(apptsRes);
  const refsRaw = refsRes?.data ?? refsRes ?? [];
  const refs = Array.isArray(refsRaw) ? refsRaw : refsRaw?.referrals || [];

  const appointmentNoShows = appts.filter((a: any) => a.status === 'no_show').length;
  const pendingIncomingReferrals = refs.filter(
    (r: any) => r.direction === 'incoming' && r.status === 'pending'
  ).length;

  return {
    todayRegistrations: pats.length,
    appointmentNoShows,
    pendingIncomingReferrals,
  };
}

// ── HR ──────────────────────────────────────────

// Change safe() calls to use the fuller response

export async function fetchHRExtras() {
  const [usersRes, shiftsRes, leavesRes] = await Promise.all([
    safe(() => getAllUsers({ isActive: true }), [] as any),
    safe(() => getShifts({ shiftDate: today() }), [] as any),
    safe(() => getLeaves({ status: 'pending' }), [] as any),
  ]);

  // getAllUsers already returns an array now ✅
  const users = Array.isArray(usersRes) ? usersRes : [];
  
  // getShifts returns { data: [...] } or [...]
  const shiftsRaw = (shiftsRes as any)?.data ?? shiftsRes;
  const shifts = Array.isArray(shiftsRaw) ? shiftsRaw : [];
  
  // getLeaves same
  const leavesRaw = (leavesRes as any)?.data ?? leavesRes;
  const leaves = Array.isArray(leavesRaw) ? leavesRaw : [];
  
  const unfilledShifts = shifts.filter((s: any) => !s.userId || s.status === 'unfilled').length;

  return {
    totalStaff: users.length,
    onShiftToday: shifts.length,
    pendingLeaves: leaves.length,
    unfilledShifts,
  };
}

// ── MASTER DISPATCHER ───────────────────────────

export async function fetchRoleExtras(role: string): Promise<Record<string, any>> {
  switch (role) {
    case 'nurse':       return fetchNurseExtras();
    case 'lab_tech':    return fetchLabExtras();
    case 'sonographer': return fetchScanExtras();
    case 'pharmacist':  return fetchPharmacyExtras();
    case 'midwife':     return fetchMaternalExtras();
    case 'accounts':    return fetchAccountsExtras();
    case 'doctor':      return fetchDoctorExtras();
    case 'records':     return fetchRecordsExtras();
    case 'hr_officer':  return fetchHRExtras();

    case 'admin':
    case 'super_admin':
      {
        const [n, l, s, p, m, a, d, r, h] = await Promise.all([
          fetchNurseExtras(),
          fetchLabExtras(),
          fetchScanExtras(),
          fetchPharmacyExtras(),
          fetchMaternalExtras(),
          fetchAccountsExtras(),
          fetchDoctorExtras(),
          fetchRecordsExtras(),
          fetchHRExtras(),
        ]);
        return {
          medsDue: n.medsDue, medsLate: n.medsLate, medsMissed: n.medsMissed,
          vitalsOverdue: n.vitalsOverdue, pendingNursingTasks: n.pendingNursingTasks,
          flaggedNotes: n.flaggedNotes,
          criticalLabs: l.criticalLabs, pendingLabTests: l.pendingLabTests,
          labSlaBreaches: l.labSlaBreaches,
          criticalScans: s.criticalScans, pendingRadiologistReview: s.pendingRadiologistReview,
          expiringStock: p.expiringStock, lowStockItems: p.lowStockItems,
          highRiskANC: m.highRiskANC, overdueANC: m.overdueANC,
          pncDueToday: m.pncDueToday, deliveriesThisWeek: m.deliveriesThisWeek,
          todayCollections: a.todayCollections, outstandingClaims: a.outstandingClaims,
          pendingWaivers: a.pendingWaivers, expiringEstimates: a.expiringEstimates,
          corporateOutstanding: a.corporateOutstanding,
          waitingOver60: d.waitingOver60, resultsReadyForMe: d.resultsReadyForMe,
          todayRegistrations: r.todayRegistrations,
          appointmentNoShows: r.appointmentNoShows,
          pendingIncomingReferrals: r.pendingIncomingReferrals,
          totalStaff: h.totalStaff, onShiftToday: h.onShiftToday,
          pendingLeaves: h.pendingLeaves, unfilledShifts: h.unfilledShifts,
        };
      }

    default:
      return {};
  }
}