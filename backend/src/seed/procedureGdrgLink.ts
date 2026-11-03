/**
 * seed_procedure_gdrg_links.ts
 *
 * Links every ProcedureTemplate to its GDRGTariff following the
 * NHIA Tariffs Operation Manual 2022 rules.
 *
 * MATCHING LOGIC:
 * ─────────────────────────────────────────────────────────────
 * 1. The GDRG code is embedded in the procedureCode (e.g. ASUR01A, DENT04C).
 *    For procedures whose code is exactly a GDRG code, we create a direct link.
 *
 * 2. For ZOOM cross-MDC codes (ZOOM01-13) we link both the zoom GDRG and the
 *    relevant specialty GDRG where the procedure also belongs.
 *
 * 3. isPrimary = true on the SINGLE most-specific GDRG for auto-resolution.
 *    For procedures with only one GDRG the isPrimary is always true.
 *
 * 4. Custom/laparoscopic procedures (source: "CUSTOM") are mapped to the
 *    closest NHIA equivalent.
 *
 * HOW TO RUN:
 *   npx ts-node seed_procedure_gdrg_links.ts
 *
 * PREREQUISITES: All ProcedureTemplate and GDRGTariff rows must exist in DB.
 */

import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'url';
import { MAPPINGS } from './procedureGdrgMappings';

const prisma = new PrismaClient();


// ─────────────────────────────────────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function seedProcedureGDRGLinks() {
  console.log('🔗 Starting ProcedureTemplate ↔ GDRGTariff link seeding...\n');
  console.log('ℹ️  NOTE: GDRGTariffProcedure.procedureId references ServiceCatalog.id');
  console.log('   Resolving via ServiceCatalog.procedureTemplateId → ProcedureTemplate.procedureCode\n');

  let created        = 0;
  let skipped        = 0;
  let procNotFound   = 0;
  let gdrgNotFound   = 0;
  let catalogNotFound = 0;
  const errors: string[] = [];

  // ── Step 1: Fetch all ProcedureTemplates keyed by procedureCode ─────────
  const allTemplates = await prisma.procedureTemplate.findMany({
    select: { id: true, procedureCode: true, name: true }
  });
  const templateMap = new Map(allTemplates.map(t => [t.procedureCode, t]));

  // ── Step 2: Fetch ServiceCatalog rows that link to a ProcedureTemplate ──
  // GDRGTariffProcedure.procedureId = ServiceCatalog.id (not ProcedureTemplate.id)
  // so we need the ServiceCatalog ID for each template.
  const allCatalogs = await prisma.serviceCatalog.findMany({
    where: { procedureTemplateId: { not: null } },
    select: { id: true, procedureTemplateId: true, name: true }
  });

  // Map: ProcedureTemplate.id → ServiceCatalog.id
  const templateIdToCatalogId = new Map(
    allCatalogs
      .filter(c => c.procedureTemplateId)
      .map(c => [c.procedureTemplateId!, c.id])
  );

  // ── Step 3: Build final map: procedureCode → ServiceCatalog.id ──────────
  // procedureCode → templateId → catalogId
  const procedureCodeToCatalogId = new Map<string, string>();
  for (const [code, template] of templateMap.entries()) {
    const catalogId = templateIdToCatalogId.get(template.id);
    if (catalogId) {
      procedureCodeToCatalogId.set(code, catalogId);
    }
  }

  // ── Step 4: GDRG Tariffs ─────────────────────────────────────────────────
  const allTariffs = await prisma.gDRGTariff.findMany({
    select: { id: true, gdrgCode: true, description: true }
  });
  const tariffMap = new Map(allTariffs.map(t => [t.gdrgCode, t]));

  console.log(`📋 Found:`);
  console.log(`   ${allTemplates.length} procedure templates`);
  console.log(`   ${allCatalogs.length} ServiceCatalog rows with procedureTemplateId`);
  console.log(`   ${procedureCodeToCatalogId.size} templates resolved to a ServiceCatalog ID`);
  console.log(`   ${allTariffs.length} GDRG tariffs\n`);

  // ── Warn about templates with no ServiceCatalog entry ───────────────────
  const mappedCodes = new Set(MAPPINGS.map(m => m.procedureCode));
  const unmappedTemplates = allTemplates.filter(
    t => mappedCodes.has(t.procedureCode) && !procedureCodeToCatalogId.has(t.procedureCode)
  );
  if (unmappedTemplates.length > 0) {
    console.log(`⚠️  ${unmappedTemplates.length} mapped procedure(s) have NO ServiceCatalog entry — they will be skipped:`);
    unmappedTemplates.forEach(t => console.log(`   - ${t.procedureCode}: ${t.name}`));
    console.log('   → Create a ServiceCatalog row with procedureTemplateId set for each of these.\n');
    skipped += unmappedTemplates.length;
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  for (const mapping of MAPPINGS) {
    // 1. Does the ProcedureTemplate exist?
    const template = templateMap.get(mapping.procedureCode);
    if (!template) {
      procNotFound++;
      errors.push(`⚠️  ProcedureTemplate not found: ${mapping.procedureCode}`);
      continue;
    }

    // 2. Is there a ServiceCatalog row pointing to this template?
    const serviceCatalogId = procedureCodeToCatalogId.get(mapping.procedureCode);
    if (!serviceCatalogId) {
      catalogNotFound++;
      // Already reported above — just count it, don't flood the error list
      continue;
    }

    for (const gdrgCode of mapping.gdrgCodes) {
      const tariff = tariffMap.get(gdrgCode);
      if (!tariff) {
        gdrgNotFound++;
        errors.push(`⚠️  GDRG tariff not found: ${gdrgCode} (for procedure ${mapping.procedureCode})`);
        continue;
      }

      const isPrimary = gdrgCode === mapping.isPrimaryGdrg;

      try {
        // procedureId here = ServiceCatalog.id — that's what the FK expects
        await prisma.gDRGTariffProcedure.upsert({
          where: {
            gdrgTariffId_procedureId: {
              gdrgTariffId: tariff.id,
              procedureId:  serviceCatalogId,
            }
          },
          update: {
            isPrimary,
            mappedCode: mapping.procedureCode,
          },
          create: {
            gdrgTariffId: tariff.id,
            procedureId:  serviceCatalogId,
            isPrimary,
            mappedCode:   mapping.procedureCode,
          }
        });
        created++;
      } catch (err: any) {
        errors.push(`❌ DB error for ${mapping.procedureCode} → ${gdrgCode}: ${err.message}`);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log('✅  SEED COMPLETE');
  console.log(`    Links created/updated      : ${created}`);
  console.log(`    Templates not in DB        : ${procNotFound}`);
  console.log(`    No ServiceCatalog entry    : ${catalogNotFound}`);
  console.log(`    GDRGs not in DB            : ${gdrgNotFound}`);
  console.log(`    Templates w/o mapping      : ${skipped}`);
  console.log(`    Mappings processed         : ${MAPPINGS.length}`);
  console.log('════════════════════════════════════════════\n');
  console.log('💡 TIP: "No ServiceCatalog entry" means the ProcedureTemplate exists');
  console.log('   but has no ServiceCatalog row with procedureTemplateId pointing to it.');
  console.log('   Run your ServiceCatalog seed first, then re-run this script.\n');

  if (errors.length > 0) {
    console.log('⚠️  Warnings / Errors:');
    errors.forEach(e => console.log('   ' + e));
  }

  await prisma.$disconnect();
}

seedProcedureGDRGLinks().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
// At the very bottom of procedureGdrgLink.ts

// ✅ Export the function so it can be imported
export { seedProcedureGDRGLinks };

// Then call it (only when file is run directly)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedProcedureGDRGLinks().catch(async (e) => {
    console.error('Fatal error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
}