import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('axios', () => ({ default: { post } }));

/**
 * The route from a stored claim to a CLAIM-it answer, with the database and the network both
 * stood in for: what matters here is which claims are allowed to leave the building, what gets
 * recorded when CLAIM-it answers, and what the desk is told when it says no.
 */
const claimFixture = (overrides: Record<string, any> = {}) => ({
  id: 'claim_1',
  claimNumber: 'NHIS-10001',
  status: 'finalized',
  claimCheckCode: '74374',
  preAuthNumber: null,
  typeOfService: 'IPD',
  typeOfAttendance: 'EAE',
  serviceOutcome: 'DISC',
  principalGDRG: 'MEDI30A',
  totalClaimAmount: 120.5,
  createdAt: new Date('2026-03-04T09:00:00Z'),
  InsuranceProvider: { id: 'nhis', type: 'nhis', name: 'NHIS' },
  Patient: {
    nhisNumber: '11111111', surname: 'MENSAH', otherNames: 'KOFI',
    dateOfBirth: new Date('1980-04-02T00:00:00Z'), gender: 'male', folderNumber: '2942/21',
    insuranceDetails: { relationship: 'self' },
  },
  Attendance: {
    nhisCCC: '74374',
    dateTime: new Date('2026-03-02T08:00:00Z'),
    Admission: { admissionDate: new Date('2026-03-02T00:00:00Z'), dischargeDate: new Date('2026-03-04T00:00:00Z') },
  },
  items: [
    { itemNumber: 1, itemCategory: 'gdrg', code: 'MEDI30A', description: 'Malaria', quantity: 1, gdrgTariff: { gdrgCode: 'MEDI30A' } },
    {
      itemNumber: 2, itemCategory: 'diagnosis', code: 'B50.9', description: 'Malaria', quantity: 1,
      gdrgTariff: { gdrgCode: 'MEDI30A' }, diagnosis: { icdCode: 'B50.9', name: 'Plasmodium Falciparum Malaria' }, clinician: 'DVA-0012',
    },
  ],
  ...overrides,
});

const batchFixture = (claims: any[], overrides: Record<string, any> = {}) => ({
  id: 'batch_1',
  batchNumber: 'NHIS-BATCH-00123',
  insuranceType: 'nhis',
  periodYear: 2026,
  periodMonth: 3,
  claims: claims.map((claim) => ({ id: claim.id })),
  ...overrides,
});

const clearEnv = () => {
  for (const key of Object.keys(process.env)) if (key.startsWith('CLAIMIT_')) delete process.env[key];
};

const freshService = async (prisma: any) => {
  clearEnv();
  process.env.CLAIMIT_BASE_URL = 'http://localhost:31719';
  process.env.CLAIMIT_USERNAME = 'hms-user';
  process.env.CLAIMIT_PASSWORD = 'hms-secret';
  process.env.CLAIMIT_ENABLED = 'true';
  vi.resetModules();
  const mod = await import('../src/modules/insuranceClaim/claimit/ClaimItSubmissionService');
  return new mod.ClaimItSubmissionService(prisma);
};

/** Rows kept in an array so attempt numbering and "latest outcome" behave like the real table. */
const fakePrisma = (claims: any[], options: { batch?: any; existing?: any[] } = {}) => {
  const rows: any[] = [...(options.existing || [])];
  const forClaim = (claimId: string) =>
    rows.filter((row) => row.claimId === claimId).sort((a, b) => b.attemptNo - a.attemptNo);

  const prisma = {
    insuranceClaim: {
      findUnique: vi.fn(async ({ where }: any) => claims.find((claim) => claim.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: any) => claims.filter((claim) => where.id.in.includes(claim.id))),
    },
    claimBatch: { findUnique: vi.fn(async () => options.batch ?? null) },
    claimItSubmission: {
      findFirst: vi.fn(async ({ where }: any) => forClaim(where.claimId)[0] ?? null),
      findMany: vi.fn(async ({ where }: any) => {
        const wanted = where?.claimId
          ? rows.filter((row) => (where.claimId.in ? where.claimId.in.includes(row.claimId) : row.claimId === where.claimId))
          : rows;
        return wanted
          .slice()
          .sort((a, b) => b.attemptNo - a.attemptNo)
          .map((row) => ({ ...row, claim: claims.find((claim) => claim.id === row.claimId) }));
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `sub_${rows.length + 1}`, createdAt: new Date('2026-03-05T10:12:00Z'), ...data };
        rows.push(row);
        return row;
      }),
    },
  };
  return { prisma, rows };
};

/** Token endpoint is answered the same way everywhere; only the claim import varies per test. */
const mockNetwork = (claimsResponse: any) => {
  post.mockImplementation(async (url: string) => {
    if (url.endsWith('/token')) return { status: 200, data: { token: 'tok-1', success: true } };
    if (typeof claimsResponse === 'function') return claimsResponse(url);
    return { status: 200, data: claimsResponse };
  });
};

const passedReport = (claimId: string, extra: Record<string, any> = {}) => ({
  reportDate: '2026-03-05 10:12:00',
  passedClaims: 1,
  failedClaims: 0,
  savedClaims: 1,
  totalCost: 120.5,
  timeTaken: '00:00:02',
  success: 1,
  claims: [{ claim: { claimID: claimId, outcome: 'PASSED', cost: '120.5', initCost: '0', ...extra } }],
});

beforeEach(() => {
  post.mockReset();
});

afterEach(() => {
  clearEnv();
});

describe('sending one claim to CLAIM-it', () => {
  it('records the attempt with the payload that left, not just the verdict', async () => {
    mockNetwork(passedReport('NHIS-10001'));
    const { prisma, rows } = fakePrisma([claimFixture()]);
    const service = await freshService(prisma);

    const result = await service.submitClaim('claim_1', 'user_1');

    expect(result).toMatchObject({ outcome: 'passed', cost: '120.5', submissionId: 'sub_1', attemptNo: 1 });
    expect(result.batch.savedClaims).toBe(1);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      claimId: 'claim_1',
      batchId: null,
      attemptNo: 1,
      outcome: 'passed',
      payerCost: '120.5',
      initialCost: '0',
      submittedById: 'user_1',
      requestId: expect.any(String),
      responseMs: expect.any(Number),
    });
    expect(rows[0].payload.memberNo).toBe('11111111');
    expect(rows[0].payload.claimID).toBe('NHIS-10001');
    expect(rows[0].reportSummary).toMatchObject({ passedClaims: 1, savedClaims: 1, claimsReported: 1 });
    // Nothing is written to the hand-recorded tracking timeline any more.
    expect(prisma.insuranceClaimTrackingEvent).toBeUndefined();
  });

  it('keeps the payer error codes on the row so they survive a page refresh', async () => {
    mockNetwork({
      passedClaims: 0,
      failedClaims: 1,
      savedClaims: 0,
      claims: [{ claim: { claimID: 'NHIS-10001', outcome: 'ERROR', errors: [{ code: 'E101', info: 'Claim check code not found', help: 'Generate a CCC from the facility portal' }] } }],
    });
    const { prisma, rows } = fakePrisma([claimFixture()]);
    const service = await freshService(prisma);

    const result = await service.submitClaim('claim_1', 'user_1');

    expect(result.outcome).toBe('error');
    expect(result.message).toBe('CLAIM-it rejected NHIS-10001: Claim check code not found');
    expect(rows[0].issues).toEqual([
      { level: 'error', code: 'E101', info: 'Claim check code not found', help: 'Generate a CCC from the facility portal' },
    ]);
  });

  it('numbers each re-send of the same claim one higher', async () => {
    mockNetwork(passedReport('NHIS-10001'));
    const { prisma, rows } = fakePrisma([claimFixture()], {
      existing: [{ id: 'sub_0', claimId: 'claim_1', attemptNo: 2, outcome: 'error', issues: [] }],
    });
    const service = await freshService(prisma);

    const result = await service.submitClaim('claim_1', 'user_1');

    expect(result.attemptNo).toBe(3);
    expect(rows[rows.length - 1].attemptNo).toBe(3);
  });

  it('stops an incomplete claim before any request leaves the server', async () => {
    const blocked = claimFixture({
      Patient: { ...claimFixture().Patient, nhisNumber: '' },
      claimCheckCode: '7437',
    });
    const { prisma, rows } = fakePrisma([blocked]);
    const service = await freshService(prisma);

    const error: any = await service.submitClaim('claim_1', 'user_1').catch((err) => err);

    expect(error.statusCode).toBe(400);
    expect(error.details.map((d: any) => d.field)).toEqual(expect.arrayContaining(['memberNo', 'claimCheckCode']));
    expect(post).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });

  it('refuses a draft claim and says what to do instead', async () => {
    const { prisma } = fakePrisma([claimFixture({ status: 'draft' })]);
    const service = await freshService(prisma);

    const error: any = await service.submitClaim('claim_1', 'user_1').catch((err) => err);
    expect(error).toMatchObject({ statusCode: 400, message: expect.stringContaining('Finalize it before sending') });
    expect(post).not.toHaveBeenCalled();
  });

  it('refuses a private claim, which is not CLAIM-it to adjudicate', async () => {
    const { prisma } = fakePrisma([claimFixture({ InsuranceProvider: { id: 'p', type: 'private', name: 'Privacy' } })]);
    const service = await freshService(prisma);

    const error: any = await service.submitClaim('claim_1', 'user_1').catch((err) => err);
    expect(error).toMatchObject({ statusCode: 400, message: expect.stringContaining('Only NHIS claims') });
  });

  it('says the status is unknown, rather than re-sending, when CLAIM-it answers without the claim', async () => {
    mockNetwork({ passedClaims: 0, failedClaims: 0, savedClaims: 0, claims: [] });
    const { prisma, rows } = fakePrisma([claimFixture()]);
    const service = await freshService(prisma);

    const result = await service.submitClaim('claim_1', 'user_1');
    expect(result.outcome).toBe('unknown');
    expect(result.message).toContain('did not report an outcome');
    expect(rows[0].outcome).toBe('unknown');
  });

  it('records an unconfirmed attempt when the import went out but the answer was lost', async () => {
    post.mockImplementation(async (url: string) => {
      if (url.endsWith('/token')) return { status: 200, data: { token: 'tok-1', success: true } };
      throw Object.assign(new Error('timeout of 30000ms exceeded'), { code: 'ECONNABORTED' });
    });
    const { prisma, rows } = fakePrisma([claimFixture()]);
    const service = await freshService(prisma);

    const error: any = await service.submitClaim('claim_1', 'user_1').catch((err) => err);

    expect(error.statusCode).toBe(502);
    expect(rows).toHaveLength(1);
    expect(rows[0].outcome).toBe('unknown');
    expect(rows[0].reportSummary.transportError).toContain('timeout');
  });

  it('records nothing when the credentials were refused and no claim was sent', async () => {
    post.mockImplementation(async (url: string) => {
      if (url.endsWith('/token')) return { status: 406, data: { failed: true } };
      throw new Error('should not get as far as the import');
    });
    const { prisma, rows } = fakePrisma([claimFixture()]);
    const service = await freshService(prisma);

    const error: any = await service.submitClaim('claim_1', 'user_1').catch((err) => err);

    expect(error.statusCode).toBe(502);
    expect(error.message).toContain('refused the API credentials');
    expect(rows).toHaveLength(0);
  });

  it('deletes the claim by the number this app gave it', async () => {
    mockNetwork({ success: true });
    const { prisma } = fakePrisma([claimFixture()]);
    const service = await freshService(prisma);

    const result = await service.deleteClaimFromClaimIt('claim_1');
    expect(result.claimNumber).toBe('NHIS-10001');
    expect(post.mock.calls.map(([url]) => url)).toContain('http://localhost:31719/json-api/claims/NHIS-10001/delete');
  });
});

describe('sending a batch to CLAIM-it', () => {
  const twoClaims = () => [
    claimFixture(),
    claimFixture({
      id: 'claim_2',
      claimNumber: 'NHIS-10002',
      Patient: { ...claimFixture().Patient, nhisNumber: '22222222', surname: 'ADJEI', otherNames: 'AMA' },
    }),
  ];

  const twoClaimReport = {
    passedClaims: 1,
    failedClaims: 1,
    warnedClaims: 0,
    savedClaims: 1,
    totalCost: 240,
    claims: [
      { claim: { claimID: 'NHIS-10001', outcome: 'PASSED', cost: '120.5' } },
      { claim: { claimID: 'NHIS-10002', outcome: 'ERROR', errors: [{ code: 'E204', info: 'Member number not found' }] } },
    ],
  };

  it('puts the whole batch in one request and records one row per claim', async () => {
    mockNetwork(twoClaimReport);
    const claims = twoClaims();
    const { prisma, rows } = fakePrisma(claims, { batch: batchFixture(claims) });
    const service = await freshService(prisma);

    const result = await service.submitBatch('batch_1', 'user_1');

    const imports = post.mock.calls.filter(([url]) => String(url).endsWith('/claims'));
    expect(imports).toHaveLength(1);
    expect(imports[0][1].claims.map((claim: any) => claim.claimID)).toEqual(['NHIS-10001', 'NHIS-10002']);

    expect(result.totals).toMatchObject({ claims: 2, sent: 2, passed: 1, failed: 1, notReady: 0 });
    expect(result.message).toContain('Sent 2 claims from NHIS-BATCH-00123');
    expect(rows.map((row) => [row.claimId, row.outcome, row.batchId])).toEqual([
      ['claim_1', 'passed', 'batch_1'],
      ['claim_2', 'error', 'batch_1'],
    ]);
    // Each claim gets its own line of the report, not the batch summary.
    expect(result.results[1].errors[0].code).toBe('E204');
  });

  it('holds back a claim that is not ready and says which field stops it', async () => {
    mockNetwork(passedReport('NHIS-10001'));
    const claims = [claimFixture(), claimFixture({ id: 'claim_2', claimNumber: 'NHIS-10002', claimCheckCode: '12' })];
    const { prisma, rows } = fakePrisma(claims, { batch: batchFixture(claims) });
    const service = await freshService(prisma);

    const result = await service.submitBatch('batch_1', 'user_1');

    expect(result.totals).toMatchObject({ claims: 2, sent: 1, notReady: 1 });
    expect(result.notReady[0].claimNumber).toBe('NHIS-10002');
    expect(result.notReady[0].reasons[0].message).toContain('5 digits');
    expect(rows.map((row) => row.claimId)).toEqual(['claim_1']);
    expect(result.message).toContain('1 claim was held back as not ready');
  });

  it('sends nothing when no claim in the batch is ready', async () => {
    const claims = [claimFixture({ claimCheckCode: '1' })];
    const { prisma, rows } = fakePrisma(claims, { batch: batchFixture(claims) });
    const service = await freshService(prisma);

    const result = await service.submitBatch('batch_1', 'user_1');

    expect(post).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
    expect(result.totals.sent).toBe(0);
    expect(result.message).toContain('Nothing was sent');
  });

  it('retry-failed re-sends the rejected claims and leaves the accepted ones alone', async () => {
    mockNetwork(passedReport('NHIS-10002'));
    const claims = twoClaims();
    const { prisma, rows } = fakePrisma(claims, {
      batch: batchFixture(claims),
      existing: [
        { id: 'sub_a', claimId: 'claim_1', attemptNo: 1, outcome: 'passed', issues: [] },
        { id: 'sub_b', claimId: 'claim_2', attemptNo: 1, outcome: 'error', issues: [] },
      ],
    });
    const service = await freshService(prisma);

    const result = await service.submitBatch('batch_1', 'user_1', { onlyFailed: true });

    expect(result.totals.alreadyAccepted).toBe(1);
    expect(result.results.map((r) => r.claimNumber)).toEqual(['NHIS-10002']);
    expect(rows[rows.length - 1].attemptNo).toBe(2);
    const imports = post.mock.calls.filter(([url]) => String(url).endsWith('/claims'));
    expect(imports[0][1].claims).toHaveLength(1);
    expect(result.message).toContain('1 already accepted were not re-sent');
  });

  it('records every claim as unconfirmed when the batch request went out and the answer was lost', async () => {
    post.mockImplementation(async (url: string) => {
      if (url.endsWith('/token')) return { status: 200, data: { token: 'tok-1', success: true } };
      throw Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
    });
    const claims = twoClaims();
    const { prisma, rows } = fakePrisma(claims, { batch: batchFixture(claims) });
    const service = await freshService(prisma);

    const result = await service.submitBatch('batch_1', 'user_1');

    expect(result.totals.unknown).toBe(2);
    expect(rows.every((row) => row.outcome === 'unknown')).toBe(true);
    expect(result.message).toContain('recorded as unconfirmed');
    expect(result.message).toContain('check them in CLAIM-it before sending again');
  });

  it('refuses a batch that is not NHIS, and one with no claims in it', async () => {
    const { prisma } = fakePrisma([], { batch: batchFixture([], { insuranceType: 'private' }) });
    const service = await freshService(prisma);
    const error: any = await service.submitBatch('batch_1', 'user_1').catch((err) => err);
    expect(error).toMatchObject({ statusCode: 400, message: expect.stringContaining('private batch') });

    const empty = fakePrisma([], { batch: batchFixture([]) });
    const emptyService = await freshService(empty.prisma);
    const emptyError: any = await emptyService.submitBatch('batch_1', 'user_1').catch((err) => err);
    expect(emptyError.message).toContain('contains no claims');
  });

  it('deletes the batch period from CLAIM-it, which is more than this app sent', async () => {
    mockNetwork({ success: true });
    const { prisma } = fakePrisma([], { batch: batchFixture([]) });
    const service = await freshService(prisma);

    const result = await service.deleteBatchFromClaimIt('batch_1');

    expect(result.period).toBe('2026-03');
    expect(post.mock.calls.map(([url]) => url)).toContain('http://localhost:31719/json-api/batch/2026/03/delete');
    expect(result.message).toContain('every NHIS claim it holds for 2026-03');
  });
});

describe('reading submission history back', () => {
  it('lists every attempt for a claim, newest first, with who sent it', async () => {
    const claims = [claimFixture()];
    const { prisma } = fakePrisma(claims, {
      existing: [
        { id: 'sub_1', claimId: 'claim_1', attemptNo: 1, outcome: 'error', issues: [{ level: 'error', code: 'E101', info: 'Claim check code not found', help: '' }], payerCost: null, initialCost: null, submittedById: 'user_1' },
        { id: 'sub_2', claimId: 'claim_1', attemptNo: 2, outcome: 'passed', issues: [], payerCost: '120.5', initialCost: '0', submittedById: 'user_1' },
      ],
    });
    const service = await freshService(prisma);

    const result = await service.listClaimSubmissions('claim_1');

    expect(result.claimNumber).toBe('NHIS-10001');
    expect(result.submissions.map((s: any) => [s.attemptNo, s.outcome])).toEqual([[2, 'passed'], [1, 'error']]);
    expect(result.submissions[1].issues[0].code).toBe('E101');
    expect(result.submissions[0].payerCost).toBe('120.5');
  });

  it('gives the batching screen one row per claim, including the claims never sent', async () => {
    const claims = twoClaimsForHistory();
    const { prisma } = fakePrisma(claims, {
      batch: batchFixture(claims),
      existing: [{ id: 'sub_1', claimId: 'claim_1', attemptNo: 1, outcome: 'warned', issues: [], payerCost: '12.5', submittedById: 'user_2' }],
    });
    const service = await freshService(prisma);

    const result = await service.listBatchSubmissions('batch_1');

    expect(result.claims).toHaveLength(2);
    expect(result.claims[0].submission.outcome).toBe('warned');
    expect(result.claims[1].submission).toBeNull();
    expect(result.totals).toMatchObject({ submitted: 1, warned: 1 });
  });
});

const twoClaimsForHistory = () => [
  claimFixture(),
  claimFixture({ id: 'claim_2', claimNumber: 'NHIS-10002' }),
];
