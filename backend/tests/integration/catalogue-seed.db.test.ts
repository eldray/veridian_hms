import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  disconnectCoreSeedPrisma,
  seedCoreData,
} from '../../src/seed/coreSeed';
import { seedProcedureGDRGLinks } from '../../src/seed/procedureGdrgLink';
import { StockItemService } from '../../src/modules/stockItem/StockItemService';
import labTests from '../../src/data/labTests.json';
import scans from '../../src/data/scans.json';
import procedures from '../../src/data/procedures.json';
import medications1 from '../../src/data/medications1.json';
import medications2 from '../../src/data/medications2.json';
import nhisMedicines from '../../src/data/nhismedicines.json';
import consumables from '../../src/data/consumables.json';
import { MAPPINGS } from '../../src/seed/procedureGdrgMappings';

const enabled = process.env.RUN_DB_TESTS === '1';
const describeDb = enabled ? describe : describe.skip;
const sourceStock = [
  ...medications1.map((item) => ({ ...item, sourceFile: 'local' })),
  ...medications2.map((item) => ({ ...item, sourceFile: 'local' })),
  ...nhisMedicines.map((item) => ({ ...item, sourceFile: 'nhis' })),
  ...consumables.map((item) => ({ ...item, sourceFile: 'consumables' })),
];
const normalize = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const identity = (item: any) => [
  normalize(item.name),
  normalize(item.strength || 'N/A'),
  normalize(item.unitOfMeasure || 'units'),
  item.isMedication === false ? 'consumable' : 'medication',
].join('|');
const nhisCodesByIdentity = new Map<string, Set<string>>();
for (const item of nhisMedicines) {
  const key = identity(item);
  const codes = nhisCodesByIdentity.get(key) ?? new Set<string>();
  codes.add(String(item.drugCode).toUpperCase());
  nhisCodesByIdentity.set(key, codes);
}
const expectedStockIdentities = new Set(sourceStock.map((item) => {
  if (item.sourceFile === 'nhis') return `NHIS:${item.drugCode}`;
  const nhisCodes = item.isMedication === false ? undefined : nhisCodesByIdentity.get(identity(item));
  if (nhisCodes?.size === 1) return `NHIS:${[...nhisCodes][0]}`;
  return `LOCAL:${identity(item)}`;
})).size;
const expectedProcedureLinks = MAPPINGS.reduce((sum, mapping) => sum + mapping.gdrgCodes.length, 0);

describeDb('clinical and NHIS catalogue seeding against PostgreSQL', () => {
  let prisma: PrismaClient;
  let seedCounts: any;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL ?? '';
    if (!/_test(\?|$)/.test(databaseUrl)) {
      throw new Error('Catalogue seed integration tests require a *_test database');
    }

    prisma = new PrismaClient();
    const result = await seedCoreData(true, {
      profile: 'production',
      adminPassword: 'integration-test-seed-password',
    });
    expect(result.success).toBe(true);
    seedCounts = result.counts;

    const procedureLinks = await seedProcedureGDRGLinks(prisma);
    expect(procedureLinks.success).toBe(true);
    expect(procedureLinks.links).toBe(expectedProcedureLinks);
  }, 120_000);

  afterAll(async () => {
    await disconnectCoreSeedPrisma().catch(() => undefined);
    if (prisma) await prisma.$disconnect();
  });

  it('seeds every source row into its clinical catalogue and links every procedure to G-DRG', async () => {
    expect(seedCounts.stockItems).toBe(sourceStock.length);
    expect(seedCounts.labTemplates).toBe(labTests.length);
    expect(seedCounts.scanTemplates).toBe(scans.length);
    expect(seedCounts.procedureTemplates).toBe(procedures.length);

    expect(await prisma.stockItem.count()).toBe(expectedStockIdentities);
    expect(await prisma.labTestTemplate.count()).toBe(labTests.length);
    expect(await prisma.scanTemplate.count()).toBe(scans.length);
    expect(await prisma.procedureTemplate.count()).toBe(procedures.length);
    expect(await prisma.serviceCatalog.count({ where: { stockItemId: { not: null } } })).toBe(expectedStockIdentities);
    expect(await prisma.serviceCatalog.count({ where: { labTestTemplateId: { not: null } } })).toBe(labTests.length);
    expect(await prisma.serviceCatalog.count({ where: { scanTemplateId: { not: null } } })).toBe(scans.length);
    expect(await prisma.serviceCatalog.count({ where: { procedureTemplateId: { not: null } } })).toBe(procedures.length);
    expect(await prisma.stockItemPayerRule.count()).toBe(nhisMedicines.length);
    expect(await prisma.gDRGTariffProcedure.count()).toBe(expectedProcedureLinks);

    const scanCodes = await prisma.serviceCatalog.findMany({
      where: { scanTemplateId: { not: null } },
      select: { nhisServiceCode: true },
    });
    expect(scanCodes).toHaveLength(scans.length);
    expect(scanCodes.every((row) => /^INVE[0-9]/i.test(String(row.nhisServiceCode || '')))).toBe(true);
  });

  it('uses one NHIS code for a matching local medicine and NHIS medicine identity', async () => {
    const canonical = await prisma.stockItem.findUnique({ where: { drugCode: 'CALCARTA1' } });
    expect(canonical).not.toBeNull();
    expect(await prisma.stockItem.findUnique({ where: { drugCode: 'CALC-CARB1' } })).toBeNull();

    const catalog = await prisma.serviceCatalog.findUnique({ where: { code: 'CALCARTA1' } });
    expect(catalog?.stockItemId).toBe(canonical?.id);
    expect(catalog?.nhisServiceCode).toBeNull();
  });

  it('generates a name-based two-digit facility code and uses it as the only medicine code', async () => {
    const service = new StockItemService(prisma);
    const item = await service.create({
      name: 'Paracetamol Test Formulation 100mg',
      category: 'medication',
      strength: '100mg',
      unitOfMeasure: 'tablet',
      costPrice: 10,
      currentStock: 0,
      isMedication: true,
      tariffCode: 'A-SECOND-CODE-MUST-NOT-BE-USED',
    });

    expect(item.drugCode).toBe('PARACETA01');
    expect(item.tariffCode).toBe(item.drugCode);
    expect(item.isNHISCovered).toBe(false);

    const catalog = await prisma.serviceCatalog.findUnique({ where: { code: 'PARACETA01' } });
    expect(catalog?.code).toBe(item.drugCode);
    expect(catalog?.nhisServiceCode).toBeNull();

    await expect(service.update(item.id, { drugCode: 'PARACETA02' })).rejects.toThrow(
      'A medicine catalogue code cannot be changed after creation',
    );
  });

  it('reruns all reference seeds without resetting stock or duplicating catalogue and pricing rows', async () => {
    const item = await prisma.stockItem.findUnique({ where: { drugCode: 'CALCARTA1' } });
    expect(item).not.toBeNull();
    await prisma.stockItem.update({ where: { id: item!.id }, data: { currentStock: 23 } });

    const before = {
      stock: await prisma.stockItem.count(),
      catalog: await prisma.serviceCatalog.count(),
      pricing: await prisma.servicePricing.count(),
      rules: await prisma.stockItemPayerRule.count(),
      procedureLinks: await prisma.gDRGTariffProcedure.count(),
    };

    const rerun = await seedCoreData(true, {
      profile: 'production',
      adminPassword: 'integration-test-seed-password',
    });
    expect(rerun.success).toBe(true);
    const relinked = await seedProcedureGDRGLinks(prisma);
    expect(relinked.links).toBe(expectedProcedureLinks);

    const after = {
      stock: await prisma.stockItem.count(),
      catalog: await prisma.serviceCatalog.count(),
      pricing: await prisma.servicePricing.count(),
      rules: await prisma.stockItemPayerRule.count(),
      procedureLinks: await prisma.gDRGTariffProcedure.count(),
    };
    expect(after).toEqual(before);
    expect((await prisma.stockItem.findUnique({ where: { id: item!.id } }))?.currentStock).toBe(23);
  }, 120_000);
});
