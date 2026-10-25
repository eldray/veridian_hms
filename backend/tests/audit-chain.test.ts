import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  computeAuditHash,
  readChain,
  stripChain,
  verifyAuditChain,
  StoredAuditRow,
} from '../src/services/auditChain';

const entry = (index: number) => ({
  entityType: 'Patient',
  entityId: `patient-${index}`,
  action: 'create',
  performedById: 'user-1',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  previousState: null,
  newState: { index },
  metadata: { method: 'POST', url: '/patients' },
  timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
});

function buildChain(count: number, startPrev: string | null = null): StoredAuditRow[] {
  const rows: StoredAuditRow[] = [];
  let prev = startPrev;
  for (let index = 0; index < count; index++) {
    const content = entry(index);
    const hash = computeAuditHash(prev, content);
    rows.push({
      ...content,
      id: `row-${index}`,
      metadata: { ...content.metadata, _chain: { prev, hash } },
    });
    prev = hash;
  }
  return rows;
}

describe('audit chain', () => {
  it('canonicalizes JSON regardless of key order and drops undefined values', () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [2, { f: 3, e: 4 }] } }))
      .toBe('{"a":{"c":[2,{"e":4,"f":3}]},"b":1}');
    expect(canonicalJson({ at: new Date(Date.UTC(2026, 0, 1)) })).toBe('{"at":"2026-01-01T00:00:00.000Z"}');
  });

  it('produces a deterministic 64-character hash that depends on the previous link', () => {
    const first = computeAuditHash(null, entry(1));
    const sameContent = { ...entry(1), newState: { index: 1 } };
    expect(computeAuditHash(null, sameContent)).toBe(first);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(computeAuditHash('a'.repeat(64), entry(1))).not.toBe(first);
  });

  it('accepts an intact chain', () => {
    const result = verifyAuditChain(buildChain(4));
    expect(result).toEqual({ ok: true, checked: 4 });
  });

  it('skips legacy rows written before chaining existed', () => {
    const legacy: StoredAuditRow[] = [
      { ...entry(0), id: 'legacy-1', metadata: { method: 'POST' } },
      { ...entry(0), id: 'legacy-2', metadata: null },
    ];
    const result = verifyAuditChain([...legacy, ...buildChain(3)]);
    expect(result).toEqual({ ok: true, checked: 3 });
  });

  it('detects an edited row', () => {
    const rows = buildChain(4);
    rows[2] = { ...rows[2], newState: { index: 999 } };
    const result = verifyAuditChain(rows);
    expect(result.ok).toBe(false);
    expect(result.brokenAtId).toBe('row-2');
    expect(result.checked).toBe(2);
  });

  it('detects a reordered or re-linked row', () => {
    const rows = buildChain(3);
    const [first, second, third] = rows;
    const result = verifyAuditChain([first, third, second]);
    expect(result.ok).toBe(false);
    expect(result.brokenAtId).toBe('row-2');
  });

  it('detects a row that is missing its chain link once chaining has started', () => {
    const rows = buildChain(3);
    rows[1] = { ...rows[1], metadata: { method: 'POST' } };
    expect(verifyAuditChain(rows)).toMatchObject({ ok: false, brokenAtId: 'row-1', checked: 1 });
  });

  it('starts mid-chain only from an explicit previous hash', () => {
    const prefix = buildChain(2);
    const link = readChain(prefix[1].metadata)?.hash ?? null;
    const suffix = buildChain(2, link);
    expect(suffix[0].metadata).toMatchObject({ _chain: { prev: link } });
    // The suffix on its own cannot prove genesis, so verification must fail.
    expect(verifyAuditChain(suffix).ok).toBe(false);
    expect(verifyAuditChain([...prefix, ...suffix])).toEqual({ ok: true, checked: 4 });
  });

  it('reads and strips the chain link without disturbing the content', () => {
    const [row] = buildChain(1);
    expect(stripChain(row.metadata)).toEqual({ method: 'POST', url: '/patients' });
    expect(readChain(row.metadata)).toMatchObject({ prev: null });
    expect(readChain({ method: 'POST' })).toBeNull();
    expect(readChain({ _chain: { prev: null, hash: 'short' } })).toBeNull();
    expect(stripChain({ _chain: { prev: null, hash: 'a'.repeat(64) } })).toBeNull();
  });
});
