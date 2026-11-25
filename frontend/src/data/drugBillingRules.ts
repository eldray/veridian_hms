// src/data/drugBillingRules.ts
// Class-based billing rules, keyed on the therapeutic class produced by data/drugCategories.ts.
//
// This is the reviewable half of the pair: drugCategories.ts answers "what class is this drug",
// this file answers "may that class be billed on this visit". Both are frontend-only data, so a
// rule here is a UI gate, not a server guarantee - the bill line is still accepted by the API.
//
// IMPORTANT: the visit buckets below are the values Attendance.attendanceType can actually hold
// (see types/index.ts AttendanceType). There is no 'family_planning' and no 'well_baby' attendance
// type in this system - Family Planning is a page and a service record, not a visit type - so a rule
// that means "a family planning visit" has to wait until those visits are typed. Do not add a rule
// keyed on a value the enum cannot produce; it will read as if it were working and never fire.
//
// A rule with `block` refuses the line; `allow` is a whitelist used on package visits where
// everything is bundled except the listed classes. If both are present, block is checked first.

import type { AttendanceType, PaymentMode } from '../types';
import { getAllClassesForDrug, getAllGroupsForDrug, getClassForDrug, type DrugClassId, type DrugGroupId } from './drugCategories';

export interface DrugBillingRule {
  id: string;
  /** What a human sees when reading the list back, and what the warning prints. */
  description: string;
  /** Rule fires only for an attendance whose attendanceType is listed here. */
  attendanceTypes: AttendanceType[];
  /** Optional second filter, e.g. only capitate-paying patients. Omit for every payment mode. */
  paymentModes?: PaymentMode[];
  /** Whitelist: only these groups/classes may be billed. */
  allowGroups?: DrugGroupId[];
  allowClasses?: DrugClassId[];
  /** Blacklist: these groups/classes may not be billed. Checked before the whitelist. */
  blockGroups?: DrugGroupId[];
  blockClasses?: DrugClassId[];
  /** 'block' stops the line; 'warn' shows the reason but lets the user proceed. */
  action: 'block' | 'warn';
  /** Overrides `description` in the message shown to the user. */
  message?: string;
}

// ── Placeholder rules - these are examples of the shape, not the live policy ──
// They are inert until the visit types they name exist. Confirm the intended policy before enabling.
export const DRUG_BILLING_RULES: DrugBillingRule[] = [
  {
    id: 'no-cytotoxics-outside-specialist',
    description: 'Cytotoxic drugs are not billable on a general consultation or walk-in counter sale.',
    attendanceTypes: ['general_consultation', 'walk_in', 'chronic_followup'],
    blockGroups: ['Oncology'],
    action: 'warn',
  },
  {
    id: 'no-live-vaccines-cold-chain-breach',
    description: 'Immunologicals and sera need a recorded indication - warn when billed to a counter sale.',
    attendanceTypes: ['walk_in'],
    blockClasses: ['immunoglobulins-sera'],
    action: 'warn',
  },
  {
    // The whitelist shape, using the example policy "only antibiotics are billed on an antenatal visit".
    // Measured against the current ledger, a strict antibiotics-only allowlist would fire on 1,413 of
    // 1,608 antenatal medication lines (analgesia 428, antiparasitic 212, endocrine 205,
    // cardiovascular 193, respiratory 188, GI 187): iron, folate and antimalarials are routine antenatal
    // care, so as written the policy is wrong and a rule that broad would drown the user in warnings.
    // The list below is the bundled set that the data actually supports; keep it at `warn`, and narrow
    // it before switching to `block`. The same rule cannot yet cover family planning or well-baby:
    // those are not attendance types.
    id: 'antenatal-package-allowlist',
    description: 'On an antenatal visit, flag any drug outside the bundled classes.',
    attendanceTypes: ['antenatal'],
    allowGroups: ['Antibacterial', 'Antiparasitic', 'Vitamins & nutrition', 'Analgesia'],
    action: 'warn',
    message: 'This drug is outside the classes usually bundled into an antenatal package - check whether it should be billed separately.',
  },
];

export interface DrugBillingDecision {
  allowed: boolean;
  warned: boolean;
  ruleId?: string;
  reason?: string;
  classId: DrugClassId;
  className: string;
}

/**
 * Does this drug pass the billing rules for this visit?
 * A combination product is judged against every class it contains - "Ciprofloxacin + Tinidazole"
 * must trip a rule written for quinolones and one written for nitroimidazoles.
 * Returns allowed=true with warned=true when a warn-level rule fired.
 */
export const checkDrugBilling = (
  stockName: string | null | undefined,
  attendance: { attendanceType?: AttendanceType; paymentMode?: PaymentMode } | null | undefined,
): DrugBillingDecision => {
  const primary = getClassForDrug(stockName);
  const classIds = getAllClassesForDrug(stockName).map(c => c.id);
  const groups = getAllGroupsForDrug(stockName);
  const base = { classId: primary.id, className: primary.label };

  const visitType = attendance?.attendanceType;
  if (!visitType) return { allowed: true, warned: false, ...base };

  const applicable = DRUG_BILLING_RULES.filter(r =>
    r.attendanceTypes.includes(visitType)
    && (!r.paymentModes || (attendance.paymentMode && r.paymentModes.includes(attendance.paymentMode))),
  );

  const matchesBlock = (rule: DrugBillingRule) =>
    rule.blockClasses?.some(c => classIds.includes(c)) || rule.blockGroups?.some(g => groups.includes(g));
  const matchesAllow = (rule: DrugBillingRule) =>
    !rule.allowGroups && !rule.allowClasses
    || rule.allowClasses?.some(c => classIds.includes(c))
    || rule.allowGroups?.some(g => groups.includes(g));

  for (const rule of applicable) {
    if (!matchesBlock(rule)) continue;
    return {
      allowed: rule.action !== 'block',
      warned: rule.action === 'block' ? false : true,
      ruleId: rule.id,
      reason: rule.message || rule.description,
      ...base,
    };
  }

  for (const rule of applicable) {
    if (matchesAllow(rule)) continue;
    return {
      allowed: rule.action !== 'block',
      warned: rule.action === 'block' ? false : true,
      ruleId: rule.id,
      reason: rule.message || rule.description,
      ...base,
    };
  }

  return { allowed: true, warned: false, ...base };
};

/** Rules that mention a class at all - used by the review screen to show what a change would affect. */
export const rulesTouchingClass = (classId: DrugClassId): DrugBillingRule[] =>
  DRUG_BILLING_RULES.filter(r =>
    r.blockClasses?.includes(classId) || r.allowClasses?.includes(classId),
  );
