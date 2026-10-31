// backend/src/modules/insuranceClaim/claimit/ClaimItSubmissionService.ts
//
// Sends finalized NHIS claims to CLAIM-it and keeps what came back.
//
// Every attempt gets its own row in `claimit_submissions`, including the payload exactly as it left
// this building. CLAIM-it re-prices a claim from its own GDRG tariffs rather than accepting our line
// prices, so when the payer's figure is disputed months later the evidence needed is what was sent,
// not what the claim row looks like today.
//
// A submission that could not be read is recorded as `unknown`, never as `error`: CLAIM-it may have
// imported it before the connection dropped, and a claim believed rejected but actually saved comes
// back as a duplicate.

import { randomUUID } from 'node:crypto';
import { buildClaimItClaim, claimGdrgCodes, findClaimItBlockers, toClaimItXml, type ClaimItClaim } from './ClaimItClaimBuilder';
import { ClaimItClient, type ClaimItReport, type ClaimItReportClaim } from './ClaimItClient';
import { InsuranceClaimRepository } from '../InsuranceClaimRepository';
import type { HttpFieldDetail } from '../../../utils/httpError';

/** One client for the process, so the token is fetched once and reused across submissions. */
export const claimItClient = new ClaimItClient();

export type ClaimItOutcomeValue = 'passed' | 'warned' | 'error' | 'unknown';

export interface ClaimItIssue {
  level: 'error' | 'warning';
  code: string;
  info: string;
  help: string;
}

export interface ClaimItSubmissionResult {
  submissionId: string | null;
  claimId: string;
  claimNumber: string;
  /** What CLAIM-it said about this claim, read off its own line of the report. */
  outcome: ClaimItOutcomeValue;
  attemptNo: number;
  cost: string | null;
  initCost: string | null;
  errors: ClaimItIssue[];
  warnings: ClaimItIssue[];
  batch: {
    reportDate?: string;
    timeTaken?: string;
    passedClaims?: number;
    failedClaims?: number;
    warnedClaims?: number;
    savedClaims?: number;
    totalCost?: number;
  };
  message: string;
}

export interface ClaimItBatchSubmissionResult {
  batchId: string;
  batchNumber: string;
  totals: {
    claims: number;
    sent: number;
    passed: number;
    warned: number;
    failed: number;
    unknown: number;
    notReady: number;
    alreadyAccepted: number;
  };
  results: ClaimItSubmissionResult[];
  /** Claims held back, each with the fields that stop it being sent. */
  notReady: Array<{ claimId: string; claimNumber: string; reasons: HttpFieldDetail[] }>;
  message: string;
}

/** Outcomes that mean the claim is already sitting in CLAIM-it's database. */
const ACCEPTED_OUTCOMES: ClaimItOutcomeValue[] = ['passed', 'warned'];

const badRequest = (message: string, details?: HttpFieldDetail[]) =>
  Object.assign(new Error(message), { statusCode: 400, ...(details ? { details } : {}) });

const notFound = (message: string) => Object.assign(new Error(message), { statusCode: 404 });

/** CLAIM-it's `code / info / help` lines, kept verbatim and stamped with which list they came from. */
const cleanIssues = (
  issues: Array<{ code?: string; info?: string; help?: string } | undefined> | undefined,
  level: ClaimItIssue['level'],
): ClaimItIssue[] =>
  (issues || []).map((issue) => ({
    level,
    code: String(issue?.code ?? '').trim(),
    info: String(issue?.info ?? '').trim(),
    help: String(issue?.help ?? '').trim(),
  }));

/**
 * CLAIM-it's line for this claim.
 *
 * The report identifies each line by the `claimID` we sent, which is our own claim number, so a
 * re-submission still finds its row. Index order is only a fallback for a server that answers
 * without echoing it.
 */
const findReportLine = (report: ClaimItReport, claimNumber: string): ClaimItReportClaim | null => {
  const lines = (report.claims || []).map((entry) => entry?.claim).filter(Boolean) as ClaimItReportClaim[];
  if (!lines.length) return null;
  const matched = lines.find((line) => String(line?.claimID ?? '').trim() === String(claimNumber).trim());
  return matched ?? (lines.length === 1 ? lines[0] : null);
};

const classifyLine = (line: ClaimItReportClaim | null, report: ClaimItReport): ClaimItOutcomeValue => {
  if (!line) {
    // No line for this claim: nothing was validated, so nothing may be reported as saved.
    return Number(report.failedClaims ?? 0) > 0 ? 'error' : 'unknown';
  }
  const outcome = String(line.outcome ?? '').trim().toUpperCase();
  if (outcome.startsWith('ERROR')) return 'error';
  if (outcome.startsWith('WARN')) return 'warned';
  if (outcome.startsWith('PASS')) return 'passed';
  return 'unknown';
};

/** Why a claim in a batch cannot go out at all, as opposed to being blocked by its content. */
const claimStatusBlocker = (claim: any): string | null => {
  if (claim?.InsuranceProvider?.type !== 'nhis') {
    return 'Only NHIS claims are sent to CLAIM-it; private and corporate claims are billed directly to the payer.';
  }
  if (claim.status !== 'finalized') {
    return `Claim ${claim.claimNumber} is still a draft. Finalize it before sending it to CLAIM-it.`;
  }
  if (!Array.isArray(claim.items) || claim.items.length === 0) {
    return `Claim ${claim.claimNumber} has no itemised lines, so there is nothing to bill. Re-generate the claim before sending it.`;
  }
  return null;
};

export class ClaimItSubmissionService {
  private repo: InsuranceClaimRepository;

  constructor(private prisma: any) {
    this.repo = new InsuranceClaimRepository(prisma);
  }

  async submitClaim(claimId: string, userId: string): Promise<ClaimItSubmissionResult> {
    const claim: any = await this.repo.findClaimById(claimId);
    if (!claim) throw notFound('Insurance claim not found');

    const statusProblem = claimStatusBlocker(claim);
    if (statusProblem) throw badRequest(statusProblem);

    const payload = buildClaimItClaim(claim);
    const blockers = findClaimItBlockers(payload, claimGdrgCodes(claim));
    if (blockers.length > 0) {
      throw badRequest(`Claim ${claim.claimNumber} is not ready to send to CLAIM-it`, blockers);
    }

    const requestId = randomUUID();
    const startedAt = Date.now();
    let report: ClaimItReport;
    try {
      report = await claimItClient.submitClaims([payload], toClaimItXml([payload]));
    } catch (err: any) {
      // A request that reached the wire may have been imported before it failed, so the attempt is
      // recorded even though the caller still gets the error.
      if (err?.claimitRequestSent) {
        await this.recordSubmission({
          claim, userId, batchId: null, payload, outcome: 'unknown',
          line: null, errors: [], warnings: [],
          report: {}, responseMs: Date.now() - startedAt, requestId,
          transportError: err?.message || 'CLAIM-it gave no response.',
        });
      }
      throw err;
    }

    const line = findReportLine(report, payload.claimID);
    const outcome = classifyLine(line, report);
    const errors = cleanIssues(line?.errors, 'error');
    const warnings = cleanIssues(line?.warnings, 'warning');
    const row = await this.recordSubmission({
      claim, userId, batchId: null, payload, outcome, line, errors, warnings,
      report, responseMs: Date.now() - startedAt, requestId,
    });

    return {
      submissionId: row?.id ?? null,
      claimId: claim.id,
      claimNumber: String(claim.claimNumber ?? ''),
      outcome,
      attemptNo: Number(row?.attemptNo ?? 1),
      cost: line?.cost ? String(line.cost) : null,
      initCost: line?.initCost ? String(line.initCost) : null,
      errors,
      warnings,
      batch: this.summariseCounters(report),
      message: this.describe(outcome, payload.claimID, errors, warnings, report),
    };
  }

  /**
   * Push a whole batch in one request.
   *
   * CLAIM-it validates each claim separately and answers with one line per claim, so the batch is
   * kept together on the wire and pulled apart again on the way back. `onlyFailed` re-sends a batch
   * after fixes without creating a second copy of the claims the payer already accepted.
   */
  async submitBatch(
    batchId: string,
    userId: string,
    options: { onlyFailed?: boolean } = {},
  ): Promise<ClaimItBatchSubmissionResult> {
    const batch = await this.prisma.claimBatch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        batchNumber: true,
        insuranceType: true,
        claims: { select: { id: true } },
      },
    });
    if (!batch) throw notFound('Claim batch not found');
    if (batch.insuranceType !== 'nhis') {
      throw badRequest(`Batch ${batch.batchNumber} is a ${batch.insuranceType} batch. Only NHIS batches go to CLAIM-it.`);
    }
    if (!batch.claims.length) {
      throw badRequest(`Batch ${batch.batchNumber} contains no claims, so there is nothing to send.`);
    }

    const claims = await this.repo.findClaimsForSubmission(batch.claims.map((claim: any) => claim.id));
    // One read for the whole batch: the last attempt per claim decides both what a retry skips and
    // what number the next attempt gets, so a 200-claim month does not cost 400 queries.
    const lastAttempt = await this.latestAttempts(claims.map((claim: any) => claim.id));

    const ready: Array<{ claim: any; payload: ClaimItClaim; attemptNo: number }> = [];
    const notReady: ClaimItBatchSubmissionResult['notReady'] = [];
    let alreadyAccepted = 0;

    for (const claim of claims) {
      const statusProblem = claimStatusBlocker(claim);
      if (statusProblem) {
        notReady.push({ claimId: claim.id, claimNumber: String(claim.claimNumber ?? ''), reasons: [{ field: 'status', message: statusProblem }] });
        continue;
      }
      const payload = buildClaimItClaim(claim);
      const blockers = findClaimItBlockers(payload, claimGdrgCodes(claim));
      if (blockers.length > 0) {
        notReady.push({ claimId: claim.id, claimNumber: String(claim.claimNumber ?? ''), reasons: blockers });
        continue;
      }
      const previous = lastAttempt.get(claim.id);
      if (options.onlyFailed && previous && ACCEPTED_OUTCOMES.includes(previous.outcome)) {
        alreadyAccepted += 1;
        continue;
      }
      ready.push({ claim, payload, attemptNo: (previous?.attemptNo ?? 0) + 1 });
    }

    const totalsOf = (results: ClaimItSubmissionResult[]): ClaimItBatchSubmissionResult['totals'] => ({
      claims: claims.length,
      sent: results.length,
      passed: results.filter((r) => r.outcome === 'passed').length,
      warned: results.filter((r) => r.outcome === 'warned').length,
      failed: results.filter((r) => r.outcome === 'error').length,
      unknown: results.filter((r) => r.outcome === 'unknown').length,
      notReady: notReady.length,
      alreadyAccepted,
    });

    if (ready.length === 0) {
      return {
        batchId: batch.id,
        batchNumber: String(batch.batchNumber),
        totals: totalsOf([]),
        results: [],
        notReady,
        message: notReady.length
          ? `Nothing was sent from ${batch.batchNumber}: ${notReady.length} ${notReady.length === 1 ? 'claim is' : 'claims are'} not ready to go to CLAIM-it.`
          : `Nothing was sent from ${batch.batchNumber}: every claim in it was already accepted by CLAIM-it.`,
      };
    }

    const payloads = ready.map((entry) => entry.payload);
    const requestId = randomUUID();
    const startedAt = Date.now();

    let report: ClaimItReport;
    try {
      report = await claimItClient.submitClaims(payloads, toClaimItXml(payloads));
    } catch (err: any) {
      const sent = err?.claimitRequestSent === true;
      const results: ClaimItSubmissionResult[] = [];
      if (sent) {
        // The import may have happened before the failure. Every claim in the request is recorded as
        // unknown so the desk checks them in CLAIM-it rather than re-sending duplicates.
        for (const entry of ready) {
          const row = await this.recordSubmission({
            claim: entry.claim, userId, batchId: batch.id, payload: entry.payload,
            outcome: 'unknown', line: null, errors: [], warnings: [],
            report: {}, responseMs: Date.now() - startedAt, requestId,
            attemptNo: entry.attemptNo,
            transportError: err?.message || 'CLAIM-it gave no response.',
          });
          results.push({
            submissionId: row?.id ?? null,
            claimId: entry.claim.id,
            claimNumber: String(entry.claim.claimNumber ?? ''),
            outcome: 'unknown',
            attemptNo: Number(row?.attemptNo ?? 1),
            cost: null,
            initCost: null,
            errors: [],
            warnings: [],
            batch: this.summariseCounters({}),
            message: this.describe('unknown', String(entry.claim.claimNumber), [], [], {
              rawResponse: err?.message || 'CLAIM-it gave no response.',
            }),
          });
        }
        return {
          batchId: batch.id,
          batchNumber: String(batch.batchNumber),
          totals: totalsOf(results),
          results,
          notReady,
          message: `${batch.batchNumber} could not be read back from CLAIM-it: ${err?.message || 'no response'}. ${results.length} ${results.length === 1 ? 'claim is' : 'claims are'} recorded as unconfirmed - check them in CLAIM-it before sending again.`,
        };
      }
      throw err;
    }

    const results: ClaimItSubmissionResult[] = [];
    for (const entry of ready) {
      const claimNumber = String(entry.claim.claimNumber ?? '');
      const line = findReportLine(report, claimNumber);
      const outcome = classifyLine(line, report);
      const errors = cleanIssues(line?.errors, 'error');
      const warnings = cleanIssues(line?.warnings, 'warning');
      const row = await this.recordSubmission({
        claim: entry.claim, userId, batchId: batch.id, payload: entry.payload,
        outcome, line, errors, warnings,
        report, responseMs: Date.now() - startedAt, requestId,
        attemptNo: entry.attemptNo,
      });
      results.push({
        submissionId: row?.id ?? null,
        claimId: entry.claim.id,
        claimNumber,
        outcome,
        attemptNo: Number(row?.attemptNo ?? 1),
        cost: line?.cost ? String(line.cost) : null,
        initCost: line?.initCost ? String(line.initCost) : null,
        errors,
        warnings,
        batch: this.summariseCounters(report),
        message: this.describe(outcome, claimNumber, errors, warnings, report),
      });
    }

    const totals = totalsOf(results);
    const parts = [
      totals.passed ? `${totals.passed} passed` : '',
      totals.warned ? `${totals.warned} accepted with warnings` : '',
      totals.failed ? `${totals.failed} rejected` : '',
      totals.unknown ? `${totals.unknown} unconfirmed` : '',
    ].filter(Boolean);
    const held = totals.notReady ? `. ${totals.notReady} ${totals.notReady === 1 ? 'claim was held back' : 'claims were held back'} as not ready` : '';
    const skipped = totals.alreadyAccepted ? `; ${totals.alreadyAccepted} already accepted were not re-sent` : '';
    return {
      batchId: batch.id,
      batchNumber: String(batch.batchNumber),
      totals,
      results,
      notReady,
      message: `Sent ${totals.sent} claims from ${batch.batchNumber}: ${parts.join(', ') || 'no outcome reported'}${held}${skipped}.`,
    };
  }

  /** Every attempt made for one claim, newest first. */
  async listClaimSubmissions(claimId: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id: claimId }, select: { id: true, claimNumber: true } });
    if (!claim) throw notFound('Insurance claim not found');
    const rows = await this.prisma.claimItSubmission.findMany({
      where: { claimId },
      orderBy: [{ attemptNo: 'desc' }],
      include: { submittedBy: { select: { id: true, fullName: true, username: true } } },
    });
    return { claimNumber: String(claim.claimNumber ?? ''), submissions: rows.map(mapRow) };
  }

  /** Latest attempt per claim in a batch, so the batching screen can show one state per row. */
  async listBatchSubmissions(batchId: string) {
    const batch = await this.prisma.claimBatch.findUnique({
      where: { id: batchId },
      select: { id: true, batchNumber: true, claims: { select: { id: true, claimNumber: true } } },
    });
    if (!batch) throw notFound('Claim batch not found');
    const rows = await this.prisma.claimItSubmission.findMany({
      where: { claimId: { in: batch.claims.map((claim: any) => claim.id) } },
      orderBy: [{ attemptNo: 'desc' }, { createdAt: 'desc' }],
      include: {
        claim: { select: { claimNumber: true } },
        submittedBy: { select: { id: true, fullName: true, username: true } },
      },
    });
    const latest = new Map<string, any>();
    for (const row of rows) {
      if (!latest.has(row.claimId)) latest.set(row.claimId, row);
    }
    return {
      batchNumber: String(batch.batchNumber),
      claims: batch.claims.map((claim: any) => {
        const row: any = latest.get(claim.id);
        return {
          claimId: claim.id,
          claimNumber: String(claim.claimNumber ?? ''),
          submission: row ? mapRow(row) : null,
        };
      }),
      totals: {
        submitted: latest.size,
        passed: countBy(latest, 'passed'),
        warned: countBy(latest, 'warned'),
        failed: countBy(latest, 'error'),
        unknown: countBy(latest, 'unknown'),
      },
    };
  }

  /** Withdraw a claim from CLAIM-it, for example before re-itemising and re-sending it. */
  async deleteClaimFromClaimIt(claimId: string): Promise<{ claimNumber: string; message: string }> {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id: claimId }, select: { claimNumber: true } });
    if (!claim) throw notFound('Insurance claim not found');
    await claimItClient.deleteClaim(String(claim.claimNumber));
    return { claimNumber: String(claim.claimNumber), message: `Claim ${claim.claimNumber} was deleted from CLAIM-it.` };
  }

  /**
   * Withdraw a whole period from CLAIM-it.
   *
   * This deletes every claim the payer holds for that month, including ones this app never sent,
   * which is why the route is admin-only and the screen asks for the batch number to be typed back.
   */
  async deleteBatchFromClaimIt(batchId: string): Promise<{ batchNumber: string; period: string; message: string }> {
    const batch = await this.prisma.claimBatch.findUnique({
      where: { id: batchId },
      select: { batchNumber: true, insuranceType: true, periodYear: true, periodMonth: true },
    });
    if (!batch) throw notFound('Claim batch not found');
    if (batch.insuranceType !== 'nhis') {
      throw badRequest(`Batch ${batch.batchNumber} is a ${batch.insuranceType} batch. CLAIM-it only holds NHIS claims.`);
    }
    const period = `${batch.periodYear}-${String(batch.periodMonth).padStart(2, '0')}`;
    await claimItClient.deleteBatch(batch.periodYear, batch.periodMonth);
    return {
      batchNumber: String(batch.batchNumber),
      period,
      message: `CLAIM-it deleted every NHIS claim it holds for ${period}.`,
    };
  }

  private async latestAttempts(claimIds: string[]): Promise<Map<string, { outcome: ClaimItOutcomeValue; attemptNo: number }>> {
    const map = new Map<string, { outcome: ClaimItOutcomeValue; attemptNo: number }>();
    if (!claimIds.length) return map;
    const rows = await this.prisma.claimItSubmission.findMany({
      where: { claimId: { in: claimIds } },
      orderBy: { attemptNo: 'desc' },
      select: { claimId: true, outcome: true, attemptNo: true },
    });
    for (const row of rows) {
      if (!map.has(row.claimId)) {
        map.set(row.claimId, { outcome: row.outcome as ClaimItOutcomeValue, attemptNo: Number(row.attemptNo) });
      }
    }
    return map;
  }

  private async nextAttemptNo(claimId: string): Promise<number> {
    const latest = await this.prisma.claimItSubmission.findFirst({
      where: { claimId },
      orderBy: { attemptNo: 'desc' },
      select: { attemptNo: true },
    });
    return Number(latest?.attemptNo ?? 0) + 1;
  }

  private async recordSubmission(args: {
    claim: any;
    userId: string;
    batchId: string | null;
    payload: ClaimItClaim;
    outcome: ClaimItOutcomeValue;
    line: ClaimItReportClaim | null;
    errors: ClaimItIssue[];
    warnings: ClaimItIssue[];
    report: ClaimItReport;
    responseMs: number;
    requestId: string;
    transportError?: string;
    attemptNo?: number;
  }) {
    // A batch already read the last attempt per claim, so it supplies the number; a single claim
    // still has to look it up.
    const attemptNo = args.attemptNo ?? (await this.nextAttemptNo(args.claim.id));
    const issues: ClaimItIssue[] = [...args.errors, ...args.warnings];
    return this.prisma.claimItSubmission.create({
      data: {
        claimId: args.claim.id,
        batchId: args.batchId,
        attemptNo,
        outcome: args.outcome,
        payload: args.payload as any,
        issues: issues as any,
        payerCost: args.line?.cost ? String(args.line.cost) : null,
        initialCost: args.line?.initCost ? String(args.line.initCost) : null,
        reportSummary: this.summariseReport(args.report, args.transportError) as any,
        responseMs: args.responseMs,
        requestId: args.requestId,
        submittedById: args.userId,
        select: { id: true, attemptNo: true },
      },
    });
  }

  private summariseCounters(report: ClaimItReport): ClaimItSubmissionResult['batch'] {
    return {
      reportDate: report.reportDate,
      timeTaken: report.timeTaken,
      passedClaims: report.passedClaims,
      failedClaims: report.failedClaims,
      warnedClaims: report.warnedClaims,
      savedClaims: report.savedClaims,
      totalCost: report.totalCost,
    };
  }

  private summariseReport(report: ClaimItReport, transportError?: string) {
    return {
      ...this.summariseCounters(report),
      success: report.success,
      claimsReported: (report.claims || []).length,
      ...(report.rawResponse ? { rawResponse: report.rawResponse.slice(0, 2000) } : {}),
      ...(transportError ? { transportError } : {}),
    };
  }

  /**
   * The reason, in the words the operator needs.
   *
   * CLAIM-it sends `code`, `info` and `help` per problem. `info` is the sentence to act on; `code`
   * is what you quote to the NHIS claims office, so both are kept and neither is dropped into a log.
   */
  private describe(
    outcome: ClaimItOutcomeValue,
    claimNumber: string,
    errors: ClaimItIssue[],
    warnings: ClaimItIssue[],
    report: ClaimItReport,
  ): string {
    if (report.rawResponse) {
      return `CLAIM-it answered ${claimNumber} in a format this app does not recognise, so the claim's status is unknown. Do not re-send it until the response is checked.`;
    }
    if (outcome === 'error') {
      const why = errors.map((error) => error.info || error.code).filter(Boolean).join('; ') || 'no reason was returned';
      return `CLAIM-it rejected ${claimNumber}: ${why}`;
    }
    if (outcome === 'warned') {
      const why = warnings.map((warning) => warning.info || warning.code).filter(Boolean).join('; ') || 'review the warnings on the claim';
      return `${claimNumber} was accepted with warnings: ${why}`;
    }
    if (outcome === 'passed') {
      const cost = report.totalCost != null ? ` Total cost CLAIM-it computed: ${report.totalCost}.` : '';
      return `${claimNumber} passed and was saved to the CLAIM-it claims database.${cost}`;
    }
    return `CLAIM-it did not report an outcome for ${claimNumber}. Check the claim in CLAIM-it before sending it again.`;
  }
}

const countBy = (rows: Map<string, any>, outcome: string) =>
  Array.from(rows.values()).filter((row) => row.outcome === outcome).length;

/** Submission rows are stored flat; the screen wants the payer's name and the issues readable. */
const mapRow = (row: any) => ({
  id: row.id,
  claimId: row.claimId,
  claimNumber: row.claim?.claimNumber ?? null,
  batchId: row.batchId ?? null,
  attemptNo: Number(row.attemptNo),
  outcome: row.outcome as ClaimItOutcomeValue,
  issues: Array.isArray(row.issues) ? row.issues : [],
  payerCost: row.payerCost == null ? null : String(row.payerCost),
  initialCost: row.initialCost == null ? null : String(row.initialCost),
  reportSummary: row.reportSummary ?? null,
  responseMs: row.responseMs ?? null,
  requestId: row.requestId ?? null,
  submittedBy: row.submittedBy?.fullName || row.submittedBy?.username || null,
  createdAt: row.createdAt,
});
