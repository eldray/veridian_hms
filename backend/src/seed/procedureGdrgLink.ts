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

async function seedProcedureGDRGLinks(client: PrismaClient = prisma) {
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
  const allTemplates = await client.procedureTemplate.findMany({
    select: { id: true, procedureCode: true, name: true }
  });
  const templateMap = new Map(allTemplates.map(t => [t.procedureCode, t]));

  // ── Step 2: Fetch ServiceCatalog rows that link to a ProcedureTemplate ──
  // GDRGTariffProcedure.procedureId = ServiceCatalog.id (not ProcedureTemplate.id)
  // so we need the ServiceCatalog ID for each template.
  const allCatalogs = await client.serviceCatalog.findMany({
    where: { procedureTemplateId: { not: null } },
    select: { id: true, procedureTemplateId: true, name: true }
  });

  // Map each ProcedureTemplate to exactly one ServiceCatalog row. Multiple catalog
  // rows for the same template are ambiguous for G-DRG linkage; do not silently
  // select whichever row happened to be last in the query result.
  const catalogIdsByTemplateId = new Map<string, string[]>();
  for (const catalog of allCatalogs) {
    if (!catalog.procedureTemplateId) continue;
    const ids = catalogIdsByTemplateId.get(catalog.procedureTemplateId) ?? [];
    ids.push(catalog.id);
    catalogIdsByTemplateId.set(catalog.procedureTemplateId, ids);
  }
  const ambiguousCatalogTemplateIds = new Set(
    Array.from(catalogIdsByTemplateId.entries())
      .filter(([, ids]) => ids.length > 1)
      .map(([templateId]) => templateId)
  );
  const templateIdToCatalogId = new Map(
    Array.from(catalogIdsByTemplateId.entries())
      .filter(([templateId, ids]) => ids.length === 1 && !ambiguousCatalogTemplateIds.has(templateId))
      .map(([templateId, ids]) => [templateId, ids[0]])
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
  const allTariffs = await client.gDRGTariff.findMany({
    select: { id: true, gdrgCode: true, description: true }
  });
  const tariffMap = new Map(allTariffs.map(t => [t.gdrgCode, t]));

  console.log(`📋 Found:`);
  console.log(`   ${allTemplates.length} procedure templates`);
  console.log(`   ${allCatalogs.length} ServiceCatalog rows with procedureTemplateId`);
  console.log(`   ${procedureCodeToCatalogId.size} templates resolved to a ServiceCatalog ID`);
  console.log(`   ${allTariffs.length} GDRG tariffs\n`);

  // Every procedure template must have a mapping and a linked service-catalogue row.
  const mappedCodes = new Set(MAPPINGS.map(m => m.procedureCode));
  const unmappedTemplates = allTemplates.filter(t => !mappedCodes.has(t.procedureCode));
  const templatesWithoutCatalog = allTemplates.filter(t => mappedCodes.has(t.procedureCode) && !procedureCodeToCatalogId.has(t.procedureCode) && !ambiguousCatalogTemplateIds.has(t.id));
  const templatesWithAmbiguousCatalog = allTemplates.filter(t => mappedCodes.has(t.procedureCode) && ambiguousCatalogTemplateIds.has(t.id));
  for (const item of unmappedTemplates) errors.push(`Procedure template has no G-DRG mapping: ${item.procedureCode} (${item.name})`);
  for (const item of templatesWithoutCatalog) errors.push(`Procedure template has no unique linked ServiceCatalog row: ${item.procedureCode} (${item.name})`);
  for (const item of templatesWithAmbiguousCatalog) {
    const count = catalogIdsByTemplateId.get(item.id)?.length ?? 0;
    errors.push(`Procedure template has ${count} ServiceCatalog rows linked to it; resolve the ambiguity before G-DRG seeding: ${item.procedureCode} (${item.name})`);
  }
  skipped = unmappedTemplates.length + templatesWithoutCatalog.length;

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

    const missingTariffs = mapping.gdrgCodes.filter((code) => !tariffMap.has(code));
    if (missingTariffs.length) {
      gdrgNotFound += missingTariffs.length;
      missingTariffs.forEach((code) => errors.push(`⚠️  GDRG tariff not found: ${code} (for procedure ${mapping.procedureCode})`));
      continue; // Keep existing links until the replacement mapping is complete.
    }

    const desiredTariffIds = mapping.gdrgCodes
      .map((code) => tariffMap.get(code)!.id);

    // Reconcile links for this procedure so obsolete G-DRGs from an older seed
    // cannot remain eligible after the mapping table has been corrected.
    await client.gDRGTariffProcedure.deleteMany({
      where: {
        procedureId: serviceCatalogId,
        ...(desiredTariffIds.length ? { gdrgTariffId: { notIn: desiredTariffIds } } : {}),
      },
    });

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
        await client.gDRGTariffProcedure.upsert({
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

  const expectedLinks = MAPPINGS.reduce((sum, mapping) => sum + mapping.gdrgCodes.length, 0);
  if (created !== expectedLinks) errors.push(`Procedure G-DRG links processed ${created}/${expectedLinks}`);
  if (errors.length > 0 || skipped > 0 || procNotFound > 0 || gdrgNotFound > 0 || catalogNotFound > 0) {
    const summary = `Procedure G-DRG seeding incomplete: ${errors.length} error(s), ${skipped} skipped template(s).\\n${errors.slice(0, 50).join('\\n')}`;
    console.error(summary);
    throw new Error(summary);
  }

  console.log('🎉 All procedure templates and G-DRG links were reconciled.');
  return { success: true, templates: allTemplates.length, links: created, mappings: MAPPINGS.length };
}

// Export for the main seed runner. Importing this module must never start a seed
// or disconnect the caller's shared Prisma lifecycle.
export { seedProcedureGDRGLinks };

// Standalone CLI execution only.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedProcedureGDRGLinks()
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}