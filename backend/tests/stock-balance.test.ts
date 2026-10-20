import { describe, expect, it, vi } from 'vitest';
import { decreaseDepartmentStockBalance, increaseDepartmentStockBalance } from '../src/modules/stockItem/StockItemRepository';
import { ValidationError } from '../src/utils/errors';

describe('department stock balance ledger', () => {
  it('creates a department balance using the department id as the stable location key', async () => {
    const upsert = vi.fn().mockResolvedValue({ quantity: 12 });
    const tx = { stockItemDepartmentBalance: { upsert } };

    await increaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 12);

    expect(upsert).toHaveBeenCalledWith({
      where: { stockItemId_locationKey: { stockItemId: 'item-1', locationKey: 'pharmacy' } },
      create: {
        stockItemId: 'item-1',
        departmentId: 'pharmacy',
        wardId: null,
        locationKey: 'pharmacy',
        quantity: 12,
      },
      update: { quantity: { increment: 12 } },
    });
  });

  it('uses a stable WARD location key for ward stock', async () => {
    const upsert = vi.fn().mockResolvedValue({ quantity: 3 });
    const tx = { stockItemDepartmentBalance: { upsert } };

    await increaseDepartmentStockBalance(tx, 'item-1', null, 3, 'ward-7');

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { stockItemId_locationKey: { stockItemId: 'item-1', locationKey: 'WARD:ward-7' } },
      create: expect.objectContaining({ departmentId: null, wardId: 'ward-7', locationKey: 'WARD:ward-7', quantity: 3 }),
    }));
  });

  it('rejects ambiguous department and ward locations', async () => {
    const tx = { stockItemDepartmentBalance: { upsert: vi.fn() } };

    await expect(increaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 1, 'ward-7'))
      .rejects.toBeInstanceOf(ValidationError);
    expect(tx.stockItemDepartmentBalance.upsert).not.toHaveBeenCalled();
  });

  it('rejects non-positive and fractional quantities', async () => {
    const tx = { stockItemDepartmentBalance: { upsert: vi.fn() } };

    await expect(increaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 0)).rejects.toBeInstanceOf(ValidationError);
    await expect(increaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 1.5)).rejects.toBeInstanceOf(ValidationError);
    expect(tx.stockItemDepartmentBalance.upsert).not.toHaveBeenCalled();
  });

  it('decrements only when the selected location has enough stock', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue({ quantity: 4 });
    const tx = { stockItemDepartmentBalance: { updateMany, findUnique } };

    await decreaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 2);

    expect(updateMany).toHaveBeenCalledWith({
      where: { stockItemId: 'item-1', locationKey: 'pharmacy', quantity: { gte: 2 } },
      data: { quantity: { decrement: 2 } },
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { stockItemId_locationKey: { stockItemId: 'item-1', locationKey: 'pharmacy' } },
    });
  });

  it('rejects a decrement that would make a location balance negative', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findUnique = vi.fn().mockResolvedValue({ quantity: 1 });
    const tx = { stockItemDepartmentBalance: { updateMany, findUnique } };

    await expect(decreaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 2))
      .rejects.toBeInstanceOf(ValidationError);
  });
});
