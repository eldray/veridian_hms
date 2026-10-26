// Tamper-evident audit trail.
//
// Every audit row commits to the row before it: hash = SHA-256(previous hash +
// canonical row content). Editing or reordering a row breaks the chain, and
// `verifyAuditChain` reports where. The link lives under `metadata._chain` so no
// schema migration is needed and older installations keep working; rows written
// before this change simply have no chain and are skipped until the first
// chained row.
import crypto from 'crypto';
import { AuditAction, Prisma, PrismaClient } from '@prisma/client';

export interface AuditEntryInput {
  entityType: string;
  entityId: string;
  action: AuditAction | string;
  performedById: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  previousState?: unknown;
  newState?: unknown;
  metadata?: Record<string, unknown> | null;
  timestamp?: Date;
}

export interface AuditChain {
  prev: string | null;
  hash: string;
}

export interface StoredAuditRow extends Omit<AuditEntryInput, 'metadata' | 'timestamp'> {
  id: string;
  timestamp: Date | string;
  metadata: unknown;
}

export interface AuditChainVerification {
  ok: boolean;
  checked: number;
  brokenAtId?: string;
}

export interface AuditChainCursor {
  prev: string | null;
  checked: number;
}

export function createAuditChainCursor(): AuditChainCursor {
  return { prev: null, checked: 0 };
}

const CHAIN_KEY = '_chain';
const GENESIS_HASH = '0'.repeat(64);
// Serialises chain appends across processes. Desktop installs run one backend,
// but a second instance or an admin script must not fork the chain.
// The lock function returns PostgreSQL `void`, which Prisma cannot deserialize.
// Selecting a scalar from a subquery keeps the (volatile) lock call while
// returning an int the client understands.
const CHAIN_LOCK_SQL = `SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext('veridian_audit_chain'))) AS chain_lock`;

function stable(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] === undefined) continue;
      out[key] = stable(source[key]);
    }
    return out;
  }
  return value;
}

/** JSON with sorted keys, so the same content always hashes the same way. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

export function computeAuditHash(
  prevHash: string | null,
  entry: Omit<AuditEntryInput, 'metadata' | 'timestamp'> & {
    timestamp: Date | string;
    metadata?: unknown;
  },
): string {
  const payload = canonicalJson({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: String(entry.action),
    performedById: entry.performedById,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
    previousState: entry.previousState ?? null,
    newState: entry.newState ?? null,
    metadata: entry.metadata ?? null,
    timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
  });
  return crypto.createHash('sha256').update(`${prevHash ?? GENESIS_HASH}\n${payload}`).digest('hex');
}

/** `metadata` without the chain link; this is what gets hashed. */
export function stripChain(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const rest: Record<string, unknown> = { ...(metadata as Record<string, unknown>) };
  delete rest[CHAIN_KEY];
  return Object.keys(rest).length > 0 ? rest : null;
}

export function readChain(metadata: unknown): AuditChain | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const chain = (metadata as Record<string, unknown>)[CHAIN_KEY];
  if (!chain || typeof chain !== 'object' || Array.isArray(chain)) return null;
  const { prev, hash } = chain as Record<string, unknown>;
  if (typeof hash !== 'string' || hash.length !== 64) return null;
  if (prev !== null && (typeof prev !== 'string' || prev.length !== 64)) return null;
  return { prev: (prev as string | null) ?? null, hash };
}

/**
 * Appends one audit row. Callers already treat audit failures as non-fatal, so
 * this may throw; the caller decides whether to log and continue.
 */
export async function appendAuditLog(prisma: PrismaClient, entry: AuditEntryInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(CHAIN_LOCK_SQL);

    // Newest rows first; skip any legacy rows written before chaining existed.
    const recent = await tx.auditLog.findMany({
      orderBy: { id: 'desc' },
      take: 50,
      select: { id: true, metadata: true },
    });
    const previous = recent.map((row) => readChain(row.metadata)).find((chain) => chain !== null) ?? null;

    const timestamp = entry.timestamp ?? new Date();
    const metadata = stripChain(entry.metadata ?? null);
    const prevHash = previous?.hash ?? null;
    const hash = computeAuditHash(prevHash, {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      performedById: entry.performedById,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      previousState: entry.previousState ?? null,
      newState: entry.newState ?? null,
      metadata,
      timestamp,
    });

    // Prisma distinguishes SQL NULL (DbNull) from JSON null; null/undefined is
    // stored as SQL NULL and read back as null, which is what the hash uses.
    const asJson = (value: unknown) =>
      value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue);

    return tx.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action as AuditAction,
        performedById: entry.performedById,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        previousState: asJson(entry.previousState),
        newState: asJson(entry.newState),
        metadata: { ...(metadata ?? {}), [CHAIN_KEY]: { prev: prevHash, hash } },
        timestamp,
      },
    });
  }, { timeout: 15000 });
}

/**
 * Verifies one page of rows in insertion order, continuing from `cursor`.
 * Rows are too numerous to load at once for large installations, so callers
 * walk the table page by page and carry the cursor between pages.
 *
 * Legacy rows without a chain are ignored until the first chained row; after
 * that every row must link to its predecessor and its stored hash must match
 * its content.
 */
export function verifyAuditChainPage(
  rows: StoredAuditRow[],
  cursor: AuditChainCursor = createAuditChainCursor(),
): AuditChainVerification & { cursor: AuditChainCursor } {
  let { prev, checked } = cursor;

  for (const row of rows) {
    const chain = readChain(row.metadata);
    if (!chain) {
      if (checked === 0) continue;
      return { ok: false, checked, brokenAtId: row.id, cursor: { prev, checked } };
    }

    if (chain.prev !== prev) {
      return { ok: false, checked, brokenAtId: row.id, cursor: { prev, checked } };
    }

    const expected = computeAuditHash(prev, {
      entityType: row.entityType,
      entityId: row.entityId,
      action: row.action,
      performedById: row.performedById,
      ipAddress: row.ipAddress ?? null,
      userAgent: row.userAgent ?? null,
      previousState: row.previousState ?? null,
      newState: row.newState ?? null,
      metadata: stripChain(row.metadata),
      timestamp: row.timestamp,
    });

    if (expected !== chain.hash) {
      return { ok: false, checked, brokenAtId: row.id, cursor: { prev, checked } };
    }

    prev = chain.hash;
    checked += 1;
  }

  return { ok: true, checked, cursor: { prev, checked } };
}

/** Verifies a whole chain that is already in memory. */
export function verifyAuditChain(rows: StoredAuditRow[]): AuditChainVerification {
  const { ok, checked, brokenAtId } = verifyAuditChainPage(rows);
  return brokenAtId ? { ok, checked, brokenAtId } : { ok, checked };
}
