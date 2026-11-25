import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  appendAuditLog,
  appendAuditLogWithinTransaction,
  verifyAuditChain,
  type StoredAuditRow,
} from '../../src/services/auditChain';

// These tests need a real PostgreSQL database. The regular unit-test job has no
// server, so they only run when the CI database job opts in.
const enabled = process.env.RUN_DB_TESTS === '1';
const describeDb = enabled ? describe : describe.skip;

describeDb('audit chain against PostgreSQL', () => {
  const marker = `db-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let prisma: PrismaClient;
  let userId: string;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL ?? '';
    if (!/_test(\?|$)/.test(databaseUrl)) {
      throw new Error('Integration tests require a *_test database');
    }

    prisma = new PrismaClient();
    // The dedicated test database starts empty; clearing guarantees the first
    // chained row is the genesis row.
    await prisma.auditLog.deleteMany();

    const user = await prisma.user.create({
      data: {
        username: `audit-db-${marker}`,
        password: 'not-used',
        fullName: 'Audit chain test',
        role: 'admin',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    if (userId) {
      await prisma.auditLog.deleteMany({ where: { performedById: userId } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  const markerRows = () =>
    prisma.auditLog.findMany({
      where: { entityId: { startsWith: marker } },
      orderBy: { id: 'asc' },
    }) as Promise<StoredAuditRow[]>;

  const append = (index: number, action: 'create' | 'update' = 'create') =>
    appendAuditLog(prisma, {
      entityType: 'DbTest',
      entityId: `${marker}-${index}`,
      action,
      performedById: userId,
      newState: { index },
      metadata: { marker },
    });

  it('serialises concurrent appends into one unbroken chain', async () => {
    await Promise.all(Array.from({ length: 8 }, (_, index) => append(index)));

    const result = verifyAuditChain(await markerRows());

    expect(result.ok).toBe(true);
    expect(result.checked).toBe(8);
  });

  it('commits audit evidence in the caller transaction and rolls it back with the business write', async () => {
    const committed = await prisma.$transaction(async (tx) => {
      return appendAuditLogWithinTransaction(tx, {
        entityType: 'DbTest',
        entityId: `${marker}-transactional`,
        action: 'create',
        performedById: userId,
        newState: { committed: true },
        metadata: { marker, source: 'caller_transaction' },
      });
    });

    expect(committed.entityId).toBe(`${marker}-transactional`);

    await expect(prisma.$transaction(async (tx) => {
      await appendAuditLogWithinTransaction(tx, {
        entityType: 'DbTest',
        entityId: `${marker}-rolled-back`,
        action: 'create',
        performedById: userId,
        newState: { committed: false },
        metadata: { marker, source: 'caller_transaction' },
      });
      throw new Error('force business transaction rollback');
    })).rejects.toThrow('force business transaction rollback');

    const committedRow = await prisma.auditLog.findFirst({ where: { entityId: `${marker}-transactional` } });
    const rolledBackRow = await prisma.auditLog.findFirst({ where: { entityId: `${marker}-rolled-back` } });
    expect(committedRow).not.toBeNull();
    expect(rolledBackRow).toBeNull();
  });

  it('detects a row edited after it was written', async () => {
    const appended = await append(99, 'update');
    const stored = await markerRows();
    const target = stored.find((row) => row.id === appended.id)!;

    await prisma.auditLog.update({
      where: { id: target.id },
      data: { metadata: { ...(target.metadata as Record<string, unknown>), tampered: true } },
    });

    const result = verifyAuditChain(await markerRows());

    expect(result.ok).toBe(false);
    expect(result.brokenAtId).toBe(target.id);
  });
});
