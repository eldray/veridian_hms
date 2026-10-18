// backend/src/shared/utils/normalizeResponse.ts
import { Prisma } from '@prisma/client';

/**
 * Deeply walks a response payload and:
 *  1. Converts Prisma.Decimal → number
 *     (safe for Decimal(15,2): values well within 2^53)
 *  2. Converts PascalCase object keys → camelCase
 *     (Prisma relation names: InsuranceProvider → insuranceProvider,
 *      BillLineItem → billLineItem, etc.)
 *
 * Rules:
 *  - Primitives, Dates, Buffers, functions → returned as-is
 *  - Prisma.Decimal → number
 *  - Arrays → mapped element-wise
 *  - Plain objects → keys transformed, values recursed
 *  - Class instances other than Decimal/Date → returned as-is
 *    (protects Prisma model instances from becoming {} by accident
 *     — but they're plain objects after `.findMany`/`.findFirst`
 *     so this is a no-op in practice)
 */

// Keys whose casing must be preserved exactly (external code systems)
const PRESERVE_KEYS = new Set([
  'GDRG',
  'MDC',
  'NHIS',
  'NHIA',
  'ICD',
  'CCC',
  'VAT',
  'GRA',
  'NHISServiceCode',
  'GDRGCode',
  'GDRGTariff',
  'GDRGTariffId',
  'NHISFacilityCode',
  'NHISNumber',
]);

const isPlainObject = (v: unknown): v is Record<string, unknown> => {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

const toCamel = (key: string): string => {
  if (PRESERVE_KEYS.has(key)) return key;
  // Already camelCase or lowercase-with-no-caps
  if (!/^[A-Z]/.test(key)) return key;
  // Convert only the leading capital: "InsuranceProvider" → "insuranceProvider",
  // "ID" → "iD" (unusual but consistent with "first letter lowercased")
  return key.charAt(0).toLowerCase() + key.slice(1);
};

/**
 * Recurse one value.
 * `depth` guards against pathological cycles (shouldn't happen in JSON,
 * but a live object graph could).
 */
const transform = (value: any, depth: number = 0): any => {
  if (depth > 30) return value; // bail out — pathological nesting
  if (value === null || value === undefined) return value;

  // Prisma Decimal
  if (value instanceof Prisma.Decimal) {
    // Decimal(15,2) max is 9_999_999_999_999.99 — comfortably inside Number.MAX_SAFE_INTEGER
    return value.toNumber();
  }

  // Date, Buffer, RegExp, etc. — pass through
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof RegExp) return value;
  if (typeof value !== 'object') return value;
  if (typeof value === 'function') return value;

  // Arrays
  if (Array.isArray(value)) {
    return value.map((v) => transform(v, depth + 1));
  }

  // Plain objects
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[toCamel(k)] = transform(v, depth + 1);
    }
    return out;
  }

  // Anything else (class instances) — pass through untouched
  return value;
};

export const normalizeResponse = <T = any>(payload: T): any => transform(payload);