import { describe, expect, it } from 'vitest';
import { StockLedger } from '../src/seed/testSeed/stockLedger';
import { replenishShelfStock } from '../src/seed/testSeed/medications';

/**
 * The demo writes prescriptions across the whole window but opens the shelf once, with the
 * 40-unit default split. Without a top-up sized to what the run actually prescribes, the first
 * two courses empty a lot and every later prescription is recorded as "not dispensed" - which
 * also strips every medicine line off the NHIS claims, since those price from dispensed stock.
 */
describe('seeded shelf replenishment', () => {
  const PHARMACY = 'dept-pharmacy';
  const stock = {
    id: 'stock-paracetamol',
    name: 'Paracetamol 500mg tablets',
    category: 'Analgesic',
    drugCode: 'PARA-500',
    isMedication: true,
    currentStock: 40,
    costPrice: 0.5,
  };

  const lookups: any = {
    medicationStock: [stock],
    consumableStock: [],
    stockForDrugGroup: () => stock,
    actorId: () => 'user-pharmacist',
  };

  const ledgerWithShelf = (shelfQuantity: number) => new StockLedger(
    [{
      id: 'batch-opening', stockItemId: stock.id, batchNumber: 'OPENING',
      expiryDate: new Date(Date.now() + 730 * 86_400_000), receivedDate: new Date(Date.now() - 400 * 86_400_000),
      quantity: shelfQuantity, costPrice: 0.5, departmentId: PHARMACY, wardId: null,
    }],
    [{ id: 'bal-pharmacy', stockItemId: stock.id, locationKey: PHARMACY, departmentId: PHARMACY, wardId: null, quantity: shelfQuantity }],
    [{ ...stock, currentStock: shelfQuantity }],
  );

  const encountersWith = (courses: Array<{ quantity: number; daysAgo: number }>) => {
    const encounters = new Map<string, any>();
    courses.forEach((course, index) => {
      const at = new Date(Date.now() - course.daysAgo * 86_400_000);
      encounters.set(`att-${index}`, {
        attendanceId: `att-${index}`,
        medPlans: [{ drugGroup: 'analgesic', quantity: course.quantity, status: 'dispensed', prescribedAt: at, dispensedAt: at }],
      });
    });
    return encounters;
  };

  const dispenseEvery = (ledger: StockLedger, encounters: Map<string, any>) => {
    let ok = 0;
    let short = 0;
    for (const encounter of encounters.values()) {
      for (const med of encounter.medPlans) {
        const result = ledger.consume(stock.id, med.quantity, {
          departmentId: PHARMACY, transactionType: 'sale',
          reference: `Encounter ${encounter.attendanceId}`, notes: '', performedBy: 'user-pharmacist',
          transactionDate: med.dispensedAt,
        });
        if (result.ok) ok++; else short++;
      }
    }
    return { ok, short };
  };

  it('buys the shelf short of and then dispenses every course the run writes', () => {
    const encounters = encountersWith(
      Array.from({ length: 12 }, (_, i) => ({ quantity: 30, daysAgo: 300 - i * 20 })),
    );
    const ledger = ledgerWithShelf(40);
    expect(dispenseEvery(ledgerWithShelf(40), encounters)).toEqual({ ok: 1, short: 11 });

    const lots = replenishShelfStock(lookups, ledger, encounters as any, PHARMACY);

    expect(lots).toBe(1);
    // 12 courses x 30 units, a quarter spare.
    expect(ledger.aggregateQuantity(stock.id)).toBe(Math.ceil(360 * 1.25));
    expect(dispenseEvery(ledger, encounters)).toEqual({ ok: 12, short: 0 });
  });

  it('leaves a shelf that already covers the period untouched', () => {
    const encounters = encountersWith([{ quantity: 30, daysAgo: 100 }]);
    const ledger = ledgerWithShelf(500);

    expect(replenishShelfStock(lookups, ledger, encounters as any, PHARMACY)).toBe(0);
    expect(ledger.aggregateQuantity(stock.id)).toBe(500);
  });

  it('records the purchase before the first course that needs it', () => {
    const encounters = encountersWith([{ quantity: 300, daysAgo: 120 }, { quantity: 300, daysAgo: 60 }]);
    const ledger = ledgerWithShelf(40);

    replenishShelfStock(lookups, ledger, encounters as any, PHARMACY);

    const purchase = ledger.pendingWrites().transactions.find((movement) => movement.transactionType === 'purchase');
    expect(purchase?.quantity).toBe(Math.ceil(600 * 1.25) - 40);
    expect(purchase!.transactionDate.getTime())
      .toBeLessThan(new Date(Date.now() - 120 * 86_400_000).getTime());
  });

  it('keeps the lot, the pharmacy balance and the hospital-wide figure in step', () => {
    const encounters = encountersWith(Array.from({ length: 8 }, (_, i) => ({ quantity: 25, daysAgo: 200 - i * 10 })));
    const ledger = ledgerWithShelf(40);

    replenishShelfStock(lookups, ledger, encounters as any, PHARMACY);
    dispenseEvery(ledger, encounters);

    const writes = ledger.pendingWrites();
    const purchased = writes.transactions.filter((m) => m.transactionType === 'purchase').reduce((s, m) => s + m.quantity, 0);
    const dispensed = writes.transactions.filter((m) => m.transactionType === 'sale').reduce((s, m) => s + m.quantity, 0);
    const onHand = 40 + purchased - dispensed;
    expect(writes.stockItems).toEqual([{ id: stock.id, currentStock: onHand }]);
    expect(writes.balances).toHaveLength(1);
    expect(writes.balances[0].quantity).toBe(onHand);
    // FEFO empties the near-dated top-up lot before the long-dated opening one, so the opening
    // lot needs no write and the new lot reports what it has left.
    expect(writes.batches).toHaveLength(0);
    expect(ledger.pendingBatches().reduce((sum, lot) => sum + lot.quantity, 0)).toBe(purchased - dispensed);
  });
});
