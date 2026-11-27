import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { appendAuditLogWithinTransaction } from '../../services/auditChain';

interface AuthRequest extends Request { user?: { id?: string; role?: string } }

const allowedResults = ['pending', 'positive', 'negative', 'invalid', 'inconclusive'];
const allowedStatuses = ['not_started', 'counselling', 'testing', 'completed', 'declined'];
const allowedLinkage = ['not_assessed', 'not_applicable', 'referred', 'linked', 'declined', 'unable_to_contact'];

export class HIVTestingController extends BaseController {
  constructor(private prisma: PrismaClient) { super(); }

  listForPatient = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const records = await this.prisma.hIVTestingRecord.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { testedAt: 'desc' },
      take: 100,
    });
    return this.ok(res, records, 'HIV testing history retrieved');
  });

  create = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body || {};
    if (!req.user?.id) return this.unauthorized(res, 'Authenticated counsellor information is required');
    if (!body.patientId || !body.entryPoint) return this.badRequest(res, 'Patient and entry point are required');
    if (body.consentGiven !== true) return this.badRequest(res, 'Consent for HTS counselling must be documented');
    const testingStatus = body.testingStatus || 'not_started';
    const result = body.result || 'pending';
    if (['testing', 'completed'].includes(testingStatus) && body.testingConsentGiven !== true) {
      return this.badRequest(res, 'Separate consent for HIV testing is required before testing begins');
    }
    if (result !== 'pending' && testingStatus !== 'completed') return this.badRequest(res, 'A test result can only be recorded when testing is completed');
    if (testingStatus === 'completed' && result === 'pending') {
      return this.badRequest(res, 'A completed test must have a recorded result');
    }
    if (testingStatus === 'declined' && result !== 'pending') {
      return this.badRequest(res, 'A declined test cannot have a test result');
    }
    if (!allowedResults.includes(result)) return this.badRequest(res, 'Invalid HIV test result');
    if (!allowedStatuses.includes(testingStatus)) return this.badRequest(res, 'Invalid testing status');
    if (body.linkageStatus && !allowedLinkage.includes(body.linkageStatus)) return this.badRequest(res, 'Invalid linkage status');
    if (body.newlyIdentifiedPositive && (testingStatus !== 'completed' || !body.resultConfirmed || result !== 'positive' || body.previouslyKnownPositive)) {
      return this.badRequest(res, 'Newly identified positive requires a confirmed positive result and no previously known positive status');
    }
    if (body.previouslyKnownPositive && body.newlyIdentifiedPositive) {
      return this.badRequest(res, 'A previously known positive cannot also be a newly identified positive');
    }
    const patient = await this.prisma.patient.findUnique({ where: { id: body.patientId }, select: { id: true } });
    if (!patient) return this.badRequest(res, 'Patient not found');
    if (body.attendanceId) {
      const attendance = await this.prisma.attendance.findFirst({
        where: { id: body.attendanceId, patientId: body.patientId }, select: { id: true },
      });
      if (!attendance) return this.badRequest(res, 'Attendance does not belong to this patient');
    }
    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.hIVTestingRecord.create({
        data: {
          patientId: body.patientId,
          attendanceId: body.attendanceId || null,
          testedAt: body.testedAt ? new Date(body.testedAt) : new Date(),
          entryPoint: String(body.entryPoint),
          testingApproach: body.testingApproach || null,
          consentGiven: true,
          testingConsentGiven: body.testingConsentGiven === true,
          consentRecordedAt: body.consentRecordedAt ? new Date(body.consentRecordedAt) : new Date(),
          counsellingPreTest: Boolean(body.counsellingPreTest),
          counsellingPostTest: Boolean(body.counsellingPostTest),
          testingStatus,
          result,
          resultConfirmed: Boolean(body.resultConfirmed),
          testAlgorithm: body.testAlgorithm || null,
          testKit: body.testKit || null,
          firstTimeTester: typeof body.firstTimeTester === 'boolean' ? body.firstTimeTester : null,
          previousTesting: body.previousTesting || null,
          previouslyKnownPositive: Boolean(body.previouslyKnownPositive),
          newlyIdentifiedPositive: Boolean(body.newlyIdentifiedPositive),
          indexTesting: Boolean(body.indexTesting),
          stiRelated: Boolean(body.stiRelated),
          keyPopulationCategory: body.keyPopulationCategory || null,
          linkageStatus: body.linkageStatus || 'not_assessed',
          linkedToCareAt: body.linkedToCareAt ? new Date(body.linkedToCareAt) : null,
          referralFacility: body.referralFacility || null,
          referralOutcome: body.referralOutcome || null,
          notes: body.notes || null,
          counsellorId: req.user!.id,
        },
      });
      await appendAuditLogWithinTransaction(tx, {
        entityType: 'HIVTestingRecord',
        entityId: created.id,
        action: 'CREATE',
        performedById: req.user!.id,
        metadata: {
          source: 'hiv_testing.record.create',
          restrictedClinicalRecord: true,
          patientAndAttendanceReferencesOmitted: true,
          testResultAndStatusOmitted: true,
          counsellingAndReferralDetailsOmitted: true,
          freeTextNotesOmitted: true,
        },
      });
      return created;
    });
    return this.created(res, record, 'HIV testing record saved');
  });

  monthlyReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const start = new Date(String(req.query.startDate || ''));
    const end = new Date(String(req.query.endDate || ''));
    if (!req.query.startDate || !req.query.endDate || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return this.badRequest(res, 'Valid startDate and endDate are required');
    }
    end.setHours(23, 59, 59, 999);
    const records = await this.prisma.hIVTestingRecord.findMany({
      where: { testedAt: { gte: start, lte: end }, testingStatus: 'completed' },
      include: { Patient: { select: { gender: true, dateOfBirth: true } } },
      orderBy: { testedAt: 'asc' },
    });
    const ageBand = (dob: Date, at: Date) => {
      let months = (at.getFullYear() - dob.getFullYear()) * 12 + at.getMonth() - dob.getMonth();
      if (at.getDate() < dob.getDate()) months--;
      const years = Math.max(0, Math.floor(months / 12));
      if (years < 5) return '0-4';
      if (years < 10) return '5-9';
      if (years < 15) return '10-14';
      if (years < 20) return '15-19';
      if (years < 25) return '20-24';
      if (years < 30) return '25-29';
      if (years < 35) return '30-34';
      if (years < 40) return '35-39';
      if (years < 45) return '40-44';
      if (years < 50) return '45-49';
      return '50+';
    };
    const rows: Record<string, any> = {};
    for (const record of records) {
      if (!record.Patient?.dateOfBirth) continue;
      const band = ageBand(record.Patient.dateOfBirth, record.testedAt);
      const key = band + ':' + record.Patient.gender;
      rows[key] ||= { ageGroup: band, gender: record.Patient.gender, tested: 0, positive: 0, previouslyKnownPositive: 0, newlyIdentifiedPositive: 0, linkedToCare: 0 };
      rows[key].tested++;
      if (record.result === 'positive' && record.resultConfirmed) rows[key].positive++;
      if (record.previouslyKnownPositive) rows[key].previouslyKnownPositive++;
      if (record.newlyIdentifiedPositive) rows[key].newlyIdentifiedPositive++;
      if (record.linkageStatus === 'linked') rows[key].linkedToCare++;
    }
    const countBy = (pick: (record: any) => string) => {
      const counts: Record<string, number> = {};
      for (const record of records) {
        const key = pick(record) || 'Not recorded';
        counts[key] = (counts[key] || 0) + 1;
      }
      return counts;
    };
    const confirmedPositive = records.filter(record => record.result === 'positive' && record.resultConfirmed);
    return this.ok(res, {
      period: { startDate: start, endDate: end },
      totals: {
        completedTests: records.length,
        confirmedPositive: confirmedPositive.length,
        previouslyKnownPositive: records.filter(record => record.previouslyKnownPositive).length,
        newlyIdentifiedPositive: records.filter(record => record.newlyIdentifiedPositive).length,
        linkedToCare: records.filter(record => record.linkageStatus === 'linked').length,
        indexTesting: records.filter(record => record.indexTesting).length,
        stiRelated: records.filter(record => record.stiRelated).length,
      },
      rows: Object.values(rows),
      entryPoints: countBy(record => record.entryPoint),
      linkageOutcomes: countBy(record => record.linkageStatus),
      keyPopulationCategories: countBy(record => record.keyPopulationCategory || 'Not recorded'),
    }, 'HIV testing report generated');
  });
}
