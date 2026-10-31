// src/seed/testSeed/shared.ts
//
// Helpers shared by every demo-data writer module. Nothing here touches the
// database except the singleton `prisma` client the orchestrator owns.
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

export const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

/** Two-decimal rounding used for every seeded money column, matching BillRepository. */
export const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Prisma Decimal / string / number / null -> JS number (0 when empty or invalid). */
export const toNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val));
  return Number.isFinite(n) ? n : 0;
};

export const addMinutes = (base: Date, minutes: number): Date => new Date(base.getTime() + minutes * 60_000);
export const addDays = (base: Date, days: number): Date => new Date(base.getTime() + days * 86_400_000);
export const daysAgo = (days: number): Date => addDays(new Date(), -days);

export const startOfToday = (): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/** A date that has not been clamped into the future never breaks a "today" worklist. */
export const notFuture = (date: Date | null | undefined): Date | null =>
  !date ? null : date.getTime() > Date.now() ? new Date(Date.now() - 60 * 60 * 1000) : date;

/** Prisma's date columns that are calendar days must never carry a time component. */
export const asCalendarDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const chunk = <T,>(rows: T[], size = 1000): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

/**
 * `createMany` with `skipDuplicates` is not available for tables whose only unique
 * key is `id`, and a single rejected batch would abort the whole seed, so every
 * chunk is written independently and a failed chunk is retried row by row.
 */
export const writeMany = async (
  label: string,
  create: (rows: any[]) => Promise<any>,
  rows: any[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<number> => {
  planned[label] = (planned[label] ?? 0) + rows.length;
  let written = 0;
  for (const part of chunk(rows, 1000)) {
    try {
      const result = await create(part);
      written += result?.count ?? part.length;
    } catch (error: any) {
      // A single bad row (a duplicate number, a stale foreign key) must not cost
      // the whole batch, so fall back to one-by-one and count only what lands.
      for (const row of part) {
        try {
          await create([row]);
          written++;
        } catch {
          /* dropped - reported by the per-model count at the end */
        }
      }
      console.warn(`   ⚠️ ${label}: retried a rejected batch of ${part.length} (${error.message?.slice(0, 120)})`);
    }
  }
  stats[label] = (stats[label] ?? 0) + written;
  return written;
};

/** Generator value -> Prisma enum member, or null when the value is not a member. */
export const pickEnum = <T extends Record<string, string>>(enumerator: T, value: any): T[keyof T] | null => {
  if (value === null || value === undefined) return null;
  const member = enumerator[value as string as keyof T];
  return member ?? null;
};

/** A stable integer drawn from a string, used for deterministic "random" choices in the writer. */
export const hashOf = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
};

/** One row of the tally the seed prints so a run can be verified without querying. */
export interface SeedTally {
  label: string;
  target: number;
  written: number;
}

export type SeedStats = Record<string, number>;

/**
 * Print what landed. A target above the written count means rows were rejected by
 * the database (a stale foreign key or a duplicate number), not that the generator
 * produced less than the plan asked for.
 */
export const reportCounts = (stats: SeedStats, planned: SeedStats): void => {
  const tally: SeedTally[] = Object.keys(planned)
    .map((label) => ({ label, target: planned[label], written: stats[label] ?? 0 }))
    .sort((a, b) => b.written - a.written);
  console.log('\n📊 Rows written by the demo seed');
  for (const entry of tally) {
    const missing = entry.target - entry.written;
    console.log(
      `   ${entry.label.padEnd(26, ' ')} ${String(entry.written).padStart(6, ' ')}/${String(entry.target).padStart(6, ' ')}`
      + (missing > 0 ? `  ⚠️ ${missing} rejected` : ''),
    );
  }
  const rejected = tally.reduce((sum, entry) => sum + (entry.target - entry.written), 0);
  console.log(rejected > 0 ? `   ⚠️ ${rejected} rows were rejected by the database` : '   ✅ every planned row landed');
};
