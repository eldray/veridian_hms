import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const codes = ['MAG-OX1', 'VITC-5001', 'ANASTRTA1'];

const providers = await p.insuranceProvider.findMany({ select: { id: true, name: true } });
console.log('== providers ==');
for (const pr of providers) console.log(JSON.stringify({ id: pr.id, name: pr.name }));

const stock = await p.stockItem.findMany({
  where: { drugCode: { in: codes } },
  select: {
    id: true, drugCode: true, name: true, isNHISCovered: true, currentStock: true,
    payerRules: { select: { insuranceProviderId: true, isCovered: true, tariffPrice: true, authorizationRequired: true, prescribingLevel: true, effectiveFrom: true, effectiveTo: true } },
    ServiceCatalog: { select: { id: true, code: true, pricing: { where: { isActive: true }, select: { cashPrice: true, nhisPrice: true } } } },
  },
});
console.log('\n== stock items ==');
for (const s of stock) {
  console.log(JSON.stringify({
    code: s.drugCode, nhisFlag: s.isNHISCovered, stock: s.currentStock,
    rules: s.payerRules.map((r) => ({ prov: r.insuranceProviderId, cov: r.isCovered, tariff: String(r.tariffPrice), auth: String(r.authorizationRequired), lvl: r.prescribingLevel, from: r.effectiveFrom?.toISOString().slice(0, 10), to: r.effectiveTo?.toISOString().slice(0, 10) ?? null })),
    catalogs: s.ServiceCatalog.map((c) => ({ id: c.id, code: c.code, pricing: c.pricing.map((x) => ({ cash: String(x.cashPrice), nhis: String(x.nhisPrice) })) })),
  }));
}

const meds = await p.medication.findMany({
  where: { StockItem: { drugCode: { in: codes } } },
  select: { id: true, attendanceId: true, quantity: true, stockItemId: true, serviceCatalogId: true, Attendance: { select: { insuranceProviderId: true } } },
  take: 6,
});

const attIds = Array.from(new Set(meds.map((m) => m.attendanceId).filter(Boolean))) as string[];
const claims = await p.insuranceClaim.findMany({
  where: { attendanceId: { in: attIds } },
  select: {
    id: true, claimNumber: true, status: true, typeOfService: true, insuranceProviderId: true, totalClaimAmount: true,
    items: { select: { itemCategory: true, code: true, quantity: true, unitPrice: true, lineTotal: true, serviceDate: true, prescriptionText: true } },
  },
});
console.log('\n== claims on those attendances ==');
for (const c of claims) {
  const cats = c.items.reduce<Record<string, number>>((acc, i) => { acc[i.itemCategory ?? '?'] = (acc[i.itemCategory ?? '?'] ?? 0) + 1; return acc; }, {});
  console.log(JSON.stringify({
    number: c.claimNumber, status: c.status, tos: c.typeOfService, prov: c.insuranceProviderId,
    total: String(c.totalClaimAmount), cats,
    meds: c.items.filter((i) => i.itemCategory === 'medicine').map((i) => ({ code: i.code, qty: i.quantity, up: String(i.unitPrice), lt: String(i.lineTotal), date: i.serviceDate?.toISOString().slice(0, 10) ?? null, rx: i.prescriptionText })),
  }));
}

// How many NHIS claims overall carry medicine lines, and how many carry none at all?
const nhisId = providers.find((x) => /nhis/i.test(x.name))?.id;
if (nhisId) {
  const withMed = await p.insuranceClaimItem.count({ where: { itemCategory: 'medicine', claim: { insuranceProviderId: nhisId } } });
  const zeroPrice = await p.insuranceClaimItem.count({ where: { itemCategory: 'medicine', unitPrice: { lte: 0 }, claim: { insuranceProviderId: nhisId } } });
  const drafts = await p.insuranceClaim.count({ where: { insuranceProviderId: nhisId, status: 'draft', items: { none: { itemCategory: 'medicine' } } } });
  const draftsAny = await p.insuranceClaim.count({ where: { insuranceProviderId: nhisId, status: 'draft' } });
  const attWithMeds = await p.attendance.count({ where: { insuranceProviderId: nhisId, Medication: { some: {} }, encounterCategory: { in: ['opd', 'ipd', 'daycase'] } } });
  console.log('\n== NHIS medicine lines ==', JSON.stringify({ nhisId, withMed, zeroPrice, draftsNoMedLine: drafts, draftsAny, attendancesDispensingMeds: attWithMeds }));
}

await p.$disconnect();
