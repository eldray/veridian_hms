import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

const grouped = await p.medication.groupBy({ by: ['notes'], where: { status: 'prescribed' }, _count: { _all: true }, orderBy: { _count: { notes: 'desc' } }, take: 8 });
console.log('== why prescribed rows were never dispensed ==');
for (const g of grouped) console.log(g._count._all, '|', String(g.notes).slice(0, 110));

const nullNotes = await p.medication.count({ where: { status: 'prescribed', notes: null } });
console.log('prescribed with no note at all:', nullNotes);

// Does the shelf have the drug at all?
const stock = await p.stockItem.aggregate({ where: { isMedication: true }, _sum: { currentStock: true }, _count: { _all: true } });
console.log('medication stock items:', JSON.stringify(stock));

const lots = await p.stockLot.aggregate({ _sum: { quantity: true }, _count: { _all: true } });
console.log('stock lots:', JSON.stringify(lots));

// A drug that DOES have an NHIS rule, and whether the shelf carries it.
const covered = await p.stockItem.findMany({
  where: { payerRules: { some: { insuranceProvider: { type: 'nhis' }, isCovered: true } }, isMedication: true },
  select: { id: true, drugCode: true, name: true, currentStock: true, _count: { select: { Medication: true } } },
  take: 5,
});
console.log('\n== NHIS-listed drugs on the shelf ==');
for (const c of covered) console.log(JSON.stringify({ code: c.drugCode, name: c.name.slice(0, 40), stock: c.currentStock, prescribed: c._count.Medication }));

const coveredCount = await p.stockItem.count({ where: { payerRules: { some: { insuranceProvider: { type: 'nhis' }, isCovered: true } }, isMedication: true } });
const coveredPrescribed = await p.medication.count({ where: { StockItem: { payerRules: { some: { insuranceProvider: { type: 'nhis' }, isCovered: true } } } } });
console.log('NHIS-listed medication stock items:', coveredCount, '| medications prescribed of them:', coveredPrescribed);

await p.$disconnect();
