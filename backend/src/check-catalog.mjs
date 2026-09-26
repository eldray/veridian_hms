// src/check-catalog.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalogId = process.argv[2] || 'cmuiuz1p403ykw130ulplupfv';

(async () => {
  console.log('\n=== Catalog entry ===');
  const catalog = await prisma.serviceCatalog.findUnique({
    where: { id: catalogId },
    select: {
      id: true,
      code: true,
      name: true,
      serviceType: true,
      labTestTemplateId: true,
      scanTemplateId: true,
      procedureTemplateId: true,
      stockItemId: true,
    },
  });
  console.log(catalog);

  if (catalog?.labTestTemplateId) {
    console.log('\n=== Linked template ===');
    const template = await prisma.labTestTemplate.findUnique({
      where: { id: catalog.labTestTemplateId },
      select: { id: true, investigationCode: true, name: true },
    });
    console.log(template ?? '⚠️ Linked template NOT FOUND — stale FK');
  } else {
    console.log('\n⚠️ No labTestTemplateId linked on this catalog entry');
  }

  console.log('\n=== Orphan count (lab_test catalogs) ===');
  const totalLabCatalogs = await prisma.serviceCatalog.count({
    where: { serviceType: 'lab_test' },
  });
  const linked = await prisma.serviceCatalog.count({
    where: { serviceType: 'lab_test', labTestTemplateId: { not: null } },
  });
  console.log(`Total lab_test catalogs: ${totalLabCatalogs}`);
  console.log(`With labTestTemplateId:  ${linked}`);
  console.log(`Orphans (null):          ${totalLabCatalogs - linked}`);

  console.log('\n=== Sample orphaned catalog entries ===');
  const orphans = await prisma.serviceCatalog.findMany({
    where: { serviceType: 'lab_test', labTestTemplateId: null },
    select: { id: true, code: true, name: true },
    take: 10,
  });
  console.log(orphans);

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});