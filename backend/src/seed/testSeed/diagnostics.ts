// src/seed/testSeed/diagnostics.ts
//
// Lab requests with released results, and scans with a real report.
//
// A lab result is stored the way the entry screen writes it - `{ parameters: [...] }`
// built from the template field descriptors - so the results page, the abnormal-value
// flags and the verification trail read a seeded investigation as a normal one.
// Status drives the rest: a requested test has no result and no verifier, a completed
// one has both, plus a turnaround that matches the gap between its timestamps.
import { Prisma } from '@prisma/client';
import { DIAGNOSTIC_RESULT_NARRATIVES, SCAN_REPORT_NARRATIVES } from '../clinicalContent.js';
import type { Actor, GeneratedLab, GeneratedScan } from '../bulkGenerator.js';
import type { Lookups } from './lookups.js';
import { hashOf, notFuture, prisma, writeMany, type SeedStats } from './shared.js';
import type { EncounterIndex } from './encounters.js';

interface LabField {
  fieldName?: string;
  label?: string;
  fieldType?: string;
  unit?: string;
  referenceRange?: string;
  lowThreshold?: number;
  highThreshold?: number;
  options?: string[];
}

/** "12 - 16" / "<5" / ">90" -> the numeric bounds a reference range implies. */
const parseRange = (text?: string | null): { low?: number; high?: number } => {
  const value = String(text ?? '').trim();
  if (!value) return {};
  const pair = value.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
  if (pair) return { low: parseFloat(pair[1]), high: parseFloat(pair[2]) };
  const upper = value.match(/^<=?\s*(-?\d+(?:\.\d+)?)/);
  if (upper) return { high: parseFloat(upper[1]) };
  const lower = value.match(/^>=?\s*(-?\d+(?:\.\d+)?)/);
  if (lower) return { low: parseFloat(lower[1]) };
  return {};
};

const boundsOf = (field: LabField) => {
  const range = parseRange(field.referenceRange);
  return {
    low: typeof field.lowThreshold === 'number' ? field.lowThreshold : range.low,
    high: typeof field.highThreshold === 'number' ? field.highThreshold : range.high,
  };
};

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const fractionOf = (salt: string): number => (hashOf(salt) % 1000) / 1000;

/** A plausible value inside or outside the range, pushed further out for a critical result. */
const numericValue = (field: LabField, salt: string, abnormalBias: number, critical: boolean): number | null => {
  const { low, high } = boundsOf(field);
  const decimals = String(field.referenceRange ?? '').includes('.') ? 1 : 0;
  const isAbnormal = hashOf(`${salt}ab`) % 100 < abnormalBias * 55;

  if (typeof low === 'number' && typeof high === 'number') {
    const span = Math.max(high - low, 1);
    if (!isAbnormal) return roundTo(low + fractionOf(salt) * span, decimals);
    const overshoot = span * (critical ? 0.9 : 0.25) + span * 0.1 * fractionOf(`${salt}o`);
    const above = hashOf(`${salt}side`) % 2 === 0;
    return roundTo(Math.max(0, above ? high + overshoot : low - overshoot), decimals);
  }
  if (typeof high === 'number') {
    return roundTo(isAbnormal ? high * (critical ? 3.2 : 1.4) : high * (0.3 + 0.6 * fractionOf(salt)), decimals);
  }
  if (typeof low === 'number') {
    return roundTo(isAbnormal ? low * (critical ? 0.3 : 0.7) : low * (1.1 + 0.5 * fractionOf(salt)), decimals);
  }
  return null;
};

const flagFor = (value: number, field: LabField): string => {
  const { low, high } = boundsOf(field);
  if (typeof low === 'number' && value < low) return 'LOW';
  if (typeof high === 'number' && value > high) return 'HIGH';
  return '';
};

const narrativeFor = (category: string, salt: string): string => {
  const pool = DIAGNOSTIC_RESULT_NARRATIVES[category] ?? DIAGNOSTIC_RESULT_NARRATIVES.other ?? [];
  return pool.length ? pool[hashOf(salt) % pool.length] : 'Result documented in the laboratory information system.';
};

/** The row id is minted here so later writers can point at a lab without reading it back. */
let labCounter = 0;
const nextLabId = () => `seedlab-${(++labCounter).toString().padStart(7, '0')}`;
let scanCounter = 0;
const nextScanId = () => `seedscan-${(++scanCounter).toString().padStart(7, '0')}`;

const actorOf = (lookups: Lookups, actor: Actor | null | undefined, role: Actor['role'], salt: string): string =>
  lookups.actorId(actor ?? { role, salt: hashOf(salt) });

export const seedLabs = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const rows: Prisma.LabTestCreateManyInput[] = [];

  for (const encounter of encounters.values()) {
    encounter.labPlans.forEach((lab, position) => {
      const template = lookups.labTemplateByCode.get(lab.testCode);
      if (!template) return;
      const fields: LabField[] = Array.isArray(template.resultTemplate) ? (template.resultTemplate as LabField[]) : [];
      const released = lab.status === 'completed';
      const inProgress = lab.status === 'in_progress';
      const completedAt = released ? notFuture(lab.completedAt) ?? lab.requestedAt : null;
      const id = nextLabId();

      const parameters = fields.map((field, fieldIndex) => {
        const salt = `${id}:${lab.testCode}:${fieldIndex}`;
        const type = field.fieldType || 'text';
        const base = {
          fieldName: field.fieldName,
          name: field.label || field.fieldName,
          fieldType: type,
          unit: field.unit || '',
          normalRange: field.referenceRange || '',
        };
        if (type === 'number') {
          const value = numericValue(field, salt, lab.abnormalBias, lab.criticalValue);
          const bounds = boundsOf(field);
          return {
            ...base,
            lowThreshold: bounds.low,
            highThreshold: bounds.high,
            value: value === null ? '' : value,
            flag: value === null ? '' : flagFor(value, field),
            required: true,
          };
        }
        if (type === 'select') {
          const options = Array.isArray(field.options) && field.options.length ? field.options : ['Present', 'Absent', 'Not detected'];
          return { ...base, options, value: options[hashOf(`${salt}opt`) % options.length], flag: '', required: false };
        }
        return { ...base, value: narrativeFor(template.category, salt), flag: '', required: false };
      });

      const firstNumeric = parameters.find((p) => p.fieldType === 'number' && p.value !== '');
      rows.push({
        id,
        attendanceId: encounter.attendanceId,
        templateId: template.id,
        serviceCatalogId: lookups.serviceByLabTemplate.get(template.id)?.id ?? null,
        status: lab.status,
        // Only a released investigation carries values; a pending request must read as pending.
        result: released
          ? {
            parameters,
            testName: template.name,
            summary: narrativeFor(template.category, `${id}:summary`),
            abnormalCount: parameters.filter((p) => p.flag).length,
            criticalValue: lab.criticalValue,
            reportedAt: completedAt,
          } as Prisma.InputJsonValue
          : undefined,
        units: firstNumeric?.unit || undefined,
        normalRange: firstNumeric?.normalRange || undefined,
        requestedAt: lab.requestedAt,
        completedAt: completedAt ?? undefined,
        turnaroundMinutes: released ? lab.turnaroundMinutes ?? undefined : undefined,
        performedById: released || inProgress ? actorOf(lookups, lab.performer, 'lab_tech', id) : undefined,
        verifiedById: released ? actorOf(lookups, lab.verifier, 'lab_tech', `${id}v`) : undefined,
        notes: lab.notes ?? (released && lab.criticalValue ? 'Critical value telephoned to the requesting clinician.' : undefined),
        createdById: lookups.actorId(lab.requester),
        priority: lab.priority,
      });
      encounter.labIds[position] = id;
    });
  }

  await writeMany('lab tests', (part) => prisma.labTest.createMany({ data: part }), rows, stats, planned);
};

export const seedScans = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const rows: Prisma.ScanCreateManyInput[] = [];

  for (const encounter of encounters.values()) {
    encounter.scanPlans.forEach((scan: GeneratedScan, position) => {
      const template = lookups.scanTemplateByCode.get(scan.scanCode);
      if (!template) return;
      const released = scan.status === 'completed';
      const inProgress = scan.status === 'in_progress';
      const narratives = SCAN_REPORT_NARRATIVES[template.category] ?? SCAN_REPORT_NARRATIVES.other ?? [];
      const narrative = narratives.length ? narratives[scan.narrativeIndex % narratives.length] : null;
      const completedAt = released ? notFuture(scan.completedAt) ?? scan.requestedAt : null;
      const id = nextScanId();

      rows.push({
        id,
        attendanceId: encounter.attendanceId,
        templateId: template.id,
        serviceCatalogId: lookups.serviceByScanTemplate.get(template.id)?.id ?? null,
        scanType: template.scanType || template.name,
        description: template.description || `${template.name} requested for ${scan.indication}`,
        bodyPart: template.bodyPart ?? undefined,
        status: scan.status,
        requestedAt: scan.requestedAt,
        completedAt: completedAt ?? undefined,
        turnaroundMinutes: released ? scan.turnaroundMinutes ?? undefined : undefined,
        // A report is only written once the image has been acquired and read.
        findings: released && narrative ? narrative.findings : undefined,
        impression: released && narrative ? narrative.impression : undefined,
        result: released ? narrative?.impression ?? scan.indication : undefined,
        performedById: released || inProgress ? actorOf(lookups, scan.performer, 'sonographer', id) : undefined,
        verifiedById: released ? actorOf(lookups, scan.verifier, 'sonographer', `${id}v`) : undefined,
        imageUrls: released ? [`/uploads/scans/${encounter.attendanceId}/${scan.scanCode.toLowerCase()}-${hashOf(id) % 1000}.dcm`] : [],
        createdById: lookups.actorId(scan.requester),
        priority: scan.priority,
      });
      encounter.scanIds[position] = id;
    });
  }

  await writeMany('scans', (part) => prisma.scan.createMany({ data: part }), rows, stats, planned);
};
