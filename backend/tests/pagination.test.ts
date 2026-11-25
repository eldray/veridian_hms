import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_PAGE_SIZE, parsePage, parsePageSize } from '../src/shared/pagination';

describe('query pagination parsing', () => {
  it('keeps valid page and limit values', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePageSize('25', 10)).toBe(25);
  });

  it('falls back for missing or malformed values', () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePageSize(undefined, 50)).toBe(50);
    expect(parsePageSize('abc', 50)).toBe(50);
    expect(parsePageSize('0', 20)).toBe(20);
    expect(parsePageSize('-10', 20)).toBe(20);
  });

  it('caps a caller-supplied limit so one request cannot dump the table', () => {
    expect(parsePageSize('100000', 10)).toBe(DEFAULT_MAX_PAGE_SIZE);
    expect(parsePageSize('100000', 500, 500)).toBe(500);
    expect(parsePageSize('501', 10)).toBe(DEFAULT_MAX_PAGE_SIZE);
  });

  it('truncates fractional values instead of passing them to Prisma', () => {
    expect(parsePageSize('7.9', 10)).toBe(7);
    expect(parsePage('2.4')).toBe(2);
  });
});
