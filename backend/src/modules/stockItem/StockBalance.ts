import { ValidationError } from '../../utils/errors';

/**
 * Department-level balance ledger.
 * locationKey is the department id, or __UNASSIGNED__ for legacy stock not yet assigned.
 * Call only inside the same Prisma transaction as the physical batch and aggregate update.
 */
export async function increaseDepartmentStockBalance(
  tx: any,
  stockItemId: string,
  departmentId: string | null | undefined,
  quantity: number,
  wardId?: string | null,
) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new ValidationError('Stock balance increase must be a positive whole number');
  }
  const normalizedDepartmentId = departmentId || null;
  const normalizedWardId = wardId || null;
  if (normalizedDepartmentId && normalizedWardId) throw new ValidationError('Stock cannot belong to a department and ward at the same time');
  const locationKey = normalizedDepartmentId || (normalizedWardId ? `WARD:${normalizedWardId}` : '__UNASSIGNED__');
  return tx.stockItemDepartmentBalance.upsert({
    where: { stockItemId_locationKey: { stockItemId, locationKey } },
    create: {
      stockItemId,
      departmentId: normalizedDepartmentId,
      wardId: normalizedWardId,
      locationKey,
      quantity,
    },
    update: { quantity: { increment: quantity } },
  });
}

export async function decreaseDepartmentStockBalance(
  tx: any,
  stockItemId: string,
  departmentId: string | null | undefined,
  quantity: number,
  wardId?: string | null,
) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new ValidationError('Stock balance decrease must be a positive whole number');
  }
  const normalizedDepartmentId = departmentId || null;
  const normalizedWardId = wardId || null;
  if (normalizedDepartmentId && normalizedWardId) throw new ValidationError('Stock cannot belong to a department and ward at the same time');
  const locationKey = normalizedDepartmentId || (normalizedWardId ? `WARD:${normalizedWardId}` : '__UNASSIGNED__');
  const result = await tx.stockItemDepartmentBalance.updateMany({
    where: { stockItemId, locationKey, quantity: { gte: quantity } },
    data: { quantity: { decrement: quantity } },
  });
  if (result.count !== 1) {
    const balance = await tx.stockItemDepartmentBalance.findUnique({
      where: { stockItemId_locationKey: { stockItemId, locationKey } },
      select: { quantity: true },
    });
    throw new ValidationError(
      `Insufficient stock balance in ${normalizedDepartmentId ? 'the selected department' : 'unassigned stock'}. Available: ${balance?.quantity ?? 0}, requested: ${quantity}`,
    );
  }
  return tx.stockItemDepartmentBalance.findUnique({
    where: { stockItemId_locationKey: { stockItemId, locationKey } },
  });
}
