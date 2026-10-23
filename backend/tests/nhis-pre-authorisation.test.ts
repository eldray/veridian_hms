import { describe, expect, it } from 'vitest';
import { approvedServicesCoverPrescription } from '../src/modules/encounter/NHISPreAuthorisation';

const prescription = {
  stockItemId: 'stock-123',
  serviceCatalogId: 'service-456',
};

describe('NHIS prior-authorisation service matching', () => {
  it('matches an explicitly approved stock item', () => {
    expect(approvedServicesCoverPrescription(
      [{ stockItemId: 'stock-123', approvedQuantity: 10 }],
      prescription,
    )).toBe(true);
  });

  it('matches an explicitly approved medication service', () => {
    expect(approvedServicesCoverPrescription(
      { services: [{ serviceCatalogId: 'service-456' }] },
      prescription,
    )).toBe(true);
  });

  it('supports nested approved-services payloads', () => {
    expect(approvedServicesCoverPrescription(
      { approvedServices: { medicines: [{ stock_item_id: 'stock-123' }] } },
      prescription,
    )).toBe(true);
  });

  it('does not treat a generic approval or requested-only service as approval', () => {
    expect(approvedServicesCoverPrescription({ approved: true }, prescription)).toBe(false);
    expect(approvedServicesCoverPrescription([{ name: 'Medicine' }], prescription)).toBe(false);
    expect(approvedServicesCoverPrescription(null, prescription)).toBe(false);
  });

  it('does not match empty identifiers in malformed approval payloads', () => {
    expect(approvedServicesCoverPrescription(
      [{ stockItemId: '', serviceCatalogId: '' }],
      { stockItemId: '', serviceCatalogId: '' },
    )).toBe(false);
    expect(approvedServicesCoverPrescription(
      [{ serviceCatalogId: '' }],
      { stockItemId: 'stock-123', serviceCatalogId: '' },
    )).toBe(false);
  });

  it('rejects a requested quantity above the explicitly approved quantity', () => {
    expect(approvedServicesCoverPrescription(
      [{ stockItemId: 'stock-123', approvedQuantity: 10 }],
      prescription,
      11,
    )).toBe(false);
    expect(approvedServicesCoverPrescription(
      [{ stockItemId: 'stock-123', approvedQuantity: 10 }],
      prescription,
      10,
    )).toBe(true);
  });

  it('fails closed for malformed explicit approved quantities', () => {
    expect(approvedServicesCoverPrescription(
      [{ stockItemId: 'stock-123', approvedQuantity: 'not-a-number' }],
      prescription,
      1,
    )).toBe(false);
    expect(approvedServicesCoverPrescription(
      [{ stockItemId: 'stock-123', approvedQuantity: 0 }],
      prescription,
      1,
    )).toBe(false);
  });

  it('preserves compatibility with service approvals that do not state a quantity', () => {
    expect(approvedServicesCoverPrescription(
      [{ stockItemId: 'stock-123' }],
      prescription,
      5,
    )).toBe(true);
  });

  it('does not match a different medicine or service', () => {
    expect(approvedServicesCoverPrescription(
      [{ stockItemId: 'stock-other', serviceCatalogId: 'service-other' }],
      prescription,
    )).toBe(false);
  });
});
