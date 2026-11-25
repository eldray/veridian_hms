import { AttendanceStatus, PrismaClient } from '@prisma/client';

// Mirrors the day-start rule the dispense path uses: a batch that expires today is still
// handable over, one that expired yesterday is not.
function startOfCurrentDay(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

const CLOSED_STATUSES: AttendanceStatus[] = ['completed', 'cancelled', 'discharged', 'referred', 'absconded'];

export interface StockAvailability {
  stockItemId: string;
  name: string;
  /** What the hospital as a whole holds. */
  onHand: number;
  /** What this store's bottleneck layer physically holds. */
  shelf: number;
  /** Lines on open tickets that will be taken from that shelf. */
  promised: number;
  /** What this store can actually hand over right now, after lines already promised. */
  available: number;
  /** The bottleneck, so the bench is told which number it is short of. */
  limitedBy: 'batch stock' | 'store balance' | 'hospital stock' | 'reserved lines';
  storeName: string | null;
}

export interface AvailabilityResult {
  /** Null when the signed-in staff member has no department — they cannot hand over at all. */
  department: { id: string; name: string } | null;
  items: Record<string, StockAvailability>;
}

/**
 * Available-to-promise for the store the handing-over staff member belongs to.
 *
 * Handing goods over runs EncounterRepository.updateMedication, which in one transaction
 * needs (a) this department's unexpired batches when the item is batch-tracked anywhere,
 * (b) this department's ledger row, and (c) the hospital-wide aggregate. So the largest
 * quantity the counter can promise is the smallest of those three, minus anything already
 * promised — a prescribed line on an open ticket has not left the shelf yet, but it will
 * be taken from those same numbers the moment someone hands it over.
 */
export async function availabilityFor(
  prisma: PrismaClient,
  actorId: string,
  stockItemIds: string[],
): Promise<AvailabilityResult> {
  const uniqueIds = Array.from(new Set(stockItemIds.filter(Boolean)));
  if (uniqueIds.length === 0) return { department: null, items: {} };

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { departmentId: true, department: { select: { id: true, name: true } } },
  });
  const departmentId = actor?.departmentId;
  if (!departmentId) return { department: null, items: {} };

  const [items, batches, balances, anyBatch, promisedRows] = await Promise.all([
    prisma.stockItem.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, currentStock: true },
    }),
    prisma.stockBatch.findMany({
      where: {
        stockItemId: { in: uniqueIds },
        departmentId,
        wardId: null,
        isActive: true,
        expiryDate: { gte: startOfCurrentDay() },
        quantity: { gt: 0 },
      },
      select: { stockItemId: true, quantity: true },
    }),
    prisma.stockItemDepartmentBalance.findMany({
      where: { stockItemId: { in: uniqueIds }, departmentId, wardId: null },
      select: { stockItemId: true, quantity: true },
    }),
    prisma.stockBatch.findMany({
      where: { stockItemId: { in: uniqueIds } },
      select: { stockItemId: true },
    }),
    // Any open ticket — counter or clinical — that still owes this line claims the shelf.
    prisma.medication.findMany({
      where: {
        stockItemId: { in: uniqueIds },
        status: 'prescribed',
        Attendance: { status: { notIn: CLOSED_STATUSES } },
      },
      select: { stockItemId: true, quantity: true },
    }),
  ]);

  const trackedIds = new Set(anyBatch.map((row) => row.stockItemId));
  const usableBatches = new Map<string, number>();
  batches.forEach((batch) => {
    usableBatches.set(batch.stockItemId, (usableBatches.get(batch.stockItemId) ?? 0) + batch.quantity);
  });
  const storeBalance = new Map<string, number>();
  balances.forEach((row) => storeBalance.set(row.stockItemId, row.quantity));
  const promised = new Map<string, number>();
  promisedRows.forEach((row) => {
    if (!row.stockItemId) return;
    promised.set(row.stockItemId, (promised.get(row.stockItemId) ?? 0) + row.quantity);
  });

  const storeName = actor.department?.name ?? null;
  const itemsOut: Record<string, StockAvailability> = {};
  items.forEach((item) => {
    const layers: Array<{ value: number; label: StockAvailability['limitedBy'] }> = [
      { value: item.currentStock, label: 'hospital stock' },
      { value: storeBalance.get(item.id) ?? 0, label: 'store balance' },
    ];
    if (trackedIds.has(item.id)) {
      layers.push({ value: usableBatches.get(item.id) ?? 0, label: 'batch stock' });
    }
    const binding = layers.reduce((worst, layer) => (layer.value < worst.value ? layer : worst));
    const owed = promised.get(item.id) ?? 0;
    const available = Math.max(0, binding.value - owed);
    itemsOut[item.id] = {
      stockItemId: item.id,
      name: item.name,
      onHand: item.currentStock,
      shelf: binding.value,
      promised: owed,
      available,
      limitedBy: available === 0 && binding.value > 0 ? 'reserved lines' : binding.label,
      storeName,
    };
  });

  return { department: { id: departmentId, name: storeName ?? 'your store' }, items: itemsOut };
}
