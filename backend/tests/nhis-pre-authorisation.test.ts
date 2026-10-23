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

  it('does not match a different medicine or service', () => {
    expect(approvedServicesCoverPrescription(
      [{ stockItemId: 'stock-other', serviceCatalogId: 'service-other' }],
      prescription,
    )).toBe(false);
  });
});
