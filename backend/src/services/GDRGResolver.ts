// services/GDRGResolver.ts
import { PrismaClient, AttendanceType, EncounterCategory } from '@prisma/client';

const prisma = new PrismaClient();

export interface GDRGResolutionResult {
  tariff: any | null;
  ambiguous: any[];         // populated when >1 tariff passes all filters
  gdrgCode: string | null;
  mdc: string | null;
  nhiaTariff: number | null;
}

export class GDRGResolver {

  // ─────────────────────────────────────────────────────────
  // PUBLIC: resolve the single best GDRG for an attendance
  // ─────────────────────────────────────────────────────────

  static async resolveForAttendance(attendanceId: string): Promise<GDRGResolutionResult> {
    const empty: GDRGResolutionResult = {
      tariff: null, ambiguous: [], gdrgCode: null, mdc: null, nhiaTariff: null
    };

    // 1. Get attendance + patient in one query
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { Patient: true }
    });
    if (!attendance) throw new Error(`Attendance ${attendanceId} not found`);

    // 2. Get primary diagnosis
    const primaryDiag = await prisma.attendanceDiagnosis.findFirst({
      where: { attendanceId, diagnosisType: 'primary' },
      include: { Diagnosis: true }
    });
    if (!primaryDiag) return empty; // no primary diagnosis yet — valid state

    // 3. Get ALL GDRGTariffs linked to this diagnosis
    const gdrgLinks = await prisma.gDRGTariffDiagnosis.findMany({
      where: { diagnosisId: primaryDiag.diagnosisId },
      include: { gdrgTariff: true },
      orderBy: { isPrimary: 'desc' } // isPrimary=true floats to top
    });
    if (!gdrgLinks.length) return empty; // no GDRG mapping at all — cash patients are fine

    const patientAge = this.calculateAge(attendance.Patient.dateOfBirth, attendance.dateTime);
    const ageSplit   = patientAge >= 12 ? 'A' : 'C';

    // 4. Filter cascade — narrows many→one using context on GDRGTariff
    const candidates = gdrgLinks
      .map(l => l.gdrgTariff)
      .filter(t => t.isActive)
      // Rule A: age split must match (A = adult ≥12, C = child <12)
      // ageSplit field on GDRGTariff is 'A', 'C', or 'AC' (applies to both)
      .filter(t => {
        if (!t.ageSplit || t.ageSplit === 'AC') return true;
        return t.ageSplit === ageSplit;
      })
      // Rule B: age range bounds (minAgeYears / maxAgeYears) if set
      .filter(t => {
        if (t.minAgeYears !== null && patientAge < t.minAgeYears) return false;
        if (t.maxAgeYears !== null && patientAge > t.maxAgeYears) return false;
        return true;
      })
      // Rule C: encounterCategory must match if set on the tariff
      .filter(t => {
        if (!t.encounterCategory) return true;
        return t.encounterCategory === attendance.encounterCategory;
      })
      // Rule D: attendanceType must be in the tariff's allowed types array
      .filter(t => {
        if (!t.attendanceTypes || t.attendanceTypes.length === 0) return true;
        return t.attendanceTypes.includes(attendance.attendanceType);
      });

    // 5. Resolve from filtered candidates
    if (candidates.length === 0) return empty;

    if (candidates.length === 1) {
      return this.buildResult(candidates[0]);
    }

    // Tie-break: prefer the link marked isPrimary=true in GDRGTariffDiagnosis
    const primaryLinkTariffId = gdrgLinks.find(l => l.isPrimary)?.gdrgTariffId;
    if (primaryLinkTariffId) {
      const preferred = candidates.find(c => c.id === primaryLinkTariffId);
      if (preferred) return this.buildResult(preferred);
    }

    // Still ambiguous — return all candidates so the caller can surface a picker
    return { tariff: null, ambiguous: candidates, gdrgCode: null, mdc: null, nhiaTariff: null };
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: resolve and write back to Attendance.gdrgCategory
  //         Call this after saving a primary AttendanceDiagnosis
  // ─────────────────────────────────────────────────────────

  static async resolveAndPersist(
    attendanceId: string
  ): Promise<{ result: GDRGResolutionResult; persisted: boolean }> {
    const result = await this.resolveForAttendance(attendanceId);

    if (result.tariff) {
      await prisma.attendance.update({
        where: { id: attendanceId },
        data: { gdrgCategory: result.gdrgCode }
      });
      return { result, persisted: true };
    }

    return { result, persisted: false };
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: manual override — clinician picks from ambiguous list
  // ─────────────────────────────────────────────────────────

  static async applyManualSelection(
    attendanceId: string,
    selectedGdrgId: string
  ): Promise<void> {
    const tariff = await prisma.gDRGTariff.findUnique({
      where: { id: selectedGdrgId }
    });
    if (!tariff) throw new Error(`GDRG tariff ${selectedGdrgId} not found`);

    await prisma.attendance.update({
      where: { id: attendanceId },
      data: { gdrgCategory: tariff.gdrgCode }
    });
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: get MDC — uses the enum field directly, never parses strings
  // ─────────────────────────────────────────────────────────

  static async getMDCFromDiagnosis(diagnosisId: string): Promise<string | null> {
    const gdrgLink = await prisma.gDRGTariffDiagnosis.findFirst({
      where: { diagnosisId, isPrimary: true },
      include: { gdrgTariff: true }
    });

    // Fall back to any link if no isPrimary=true one exists
    const link = gdrgLink ?? await prisma.gDRGTariffDiagnosis.findFirst({
      where: { diagnosisId },
      include: { gdrgTariff: true }
    });

    // Use the mdc enum field — never parse the gdrgCode string
    return link?.gdrgTariff?.mdc ?? null;
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: bulk resolve for claim generation
  //         Efficient — one DB round-trip per attendance, no N+1
  // ─────────────────────────────────────────────────────────

  static async bulkResolveForClaims(
    attendanceIds: string[]
  ): Promise<Map<string, GDRGResolutionResult>> {
    const results = new Map<string, GDRGResolutionResult>();

    // Fetch all in one query
    const attendances = await prisma.attendance.findMany({
      where: { id: { in: attendanceIds } },
      include: {
        Patient: true,
        AttendanceDiagnosis: {
          where: { diagnosisType: 'primary' },
          include: {
            Diagnosis: {
              include: {
                gdrgTariffDiagnoses: {
                  include: { gdrgTariff: true },
                  orderBy: { isPrimary: 'desc' }
                }
              }
            }
          }
        }
      }
    });

    for (const attendance of attendances) {
      const primary = attendance.AttendanceDiagnosis[0];
      if (!primary?.Diagnosis) {
        results.set(attendance.id, { tariff: null, ambiguous: [], gdrgCode: null, mdc: null, nhiaTariff: null });
        continue;
      }

      const patientAge = this.calculateAge(attendance.Patient.dateOfBirth, attendance.dateTime);
      const ageSplit   = patientAge >= 12 ? 'A' : 'C';
      const links      = primary.Diagnosis.gdrgTariffDiagnoses;

      const candidates = links
        .map(l => l.gdrgTariff)
        .filter(t => t.isActive)
        .filter(t => !t.ageSplit || t.ageSplit === 'AC' || t.ageSplit === ageSplit)
        .filter(t => t.minAgeYears === null || patientAge >= t.minAgeYears)
        .filter(t => t.maxAgeYears === null || patientAge <= t.maxAgeYears)
        .filter(t => !t.encounterCategory || t.encounterCategory === attendance.encounterCategory)
        .filter(t => !t.attendanceTypes?.length || t.attendanceTypes.includes(attendance.attendanceType));

      if (candidates.length === 0) {
        results.set(attendance.id, { tariff: null, ambiguous: [], gdrgCode: null, mdc: null, nhiaTariff: null });
      } else if (candidates.length === 1) {
        results.set(attendance.id, this.buildResult(candidates[0]));
      } else {
        const preferred = links.find(l => l.isPrimary);
        const top = preferred ? candidates.find(c => c.id === preferred.gdrgTariffId) : null;
        if (top) {
          results.set(attendance.id, this.buildResult(top));
        } else {
          results.set(attendance.id, { tariff: null, ambiguous: candidates, gdrgCode: null, mdc: null, nhiaTariff: null });
        }
      }
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE helpers
  // ─────────────────────────────────────────────────────────

  private static buildResult(tariff: any): GDRGResolutionResult {
    return {
      tariff,
      ambiguous: [],
      gdrgCode: tariff.gdrgCode,
      mdc: tariff.mdc,
      nhiaTariff: tariff.nhiaTariff
    };
  }

  private static calculateAge(dob: Date, referenceDate: Date): number {
    const birth = new Date(dob);
    const ref   = new Date(referenceDate);
    let age = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
    return Math.max(0, age);
  }
}