import { describe, expect, it } from 'vitest';
import { StockTransactionService } from '../src/modules/stockTransaction/StockTransactionService';
import { ValidationError } from '../src/utils/errors';

describe('stock transaction validation', () => {
  const service = new StockTransactionService({} as any);

  it('requires a department assignment for non-admin stock movements', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: 1,
      role: 'pharmacist',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('requires a reason for expiry or damage write-offs', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'write_off',
      quantity: 1,
      role: 'admin',
      departmentId: 'pharmacy',
      notes: '   ',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects fractional stock quantities', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: 1.5,
      role: 'admin',
      departmentId: 'pharmacy',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects selecting a department and ward at the same time', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: 1,
      role: 'admin',
      departmentId: 'pharmacy',
      wardId: 'ward-7',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('requires internal transfers to use the dedicated transfer workflow', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'transfer_out',
      quantity: 1,
      role: 'admin',
      departmentId: 'pharmacy',
    })).rejects.toBeInstanceOf(ValidationError);
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'transfer_in',
      quantity: 1,
      role: 'admin',
      departmentId: 'ward',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('only allows administrators to select a ward directly', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: 1,
      role: 'pharmacist',
      wardId: 'ward-7',
    })).rejects.toBeInstanceOf(ValidationError);
  });
});
