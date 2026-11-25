// src/scripts/backfillMedicationDoses.mjs
//
// One-time backfill: reads every Medication.administeredDoses JSON blob
// and materializes real MedicationDose rows.
//
// Safe to re-run: skips medications that already have MedicationDose rows.
//
// Usage:
//   node src/scripts/backfillMedicationDoses.mjs
//   node src/scripts/backfillMedicationDoses.mjs --dry-run

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Parse a frequency string into (intervalHours, requiredDoses).
 * Best-effort. If we can't parse, we fall back to "1 dose, 24h apart"
 * which still produces a usable record.
 */
function parseFrequency(freq) {
  if (!freq) return { intervalHours: 24, requiredDoses: 1 };
  const f = String(freq).toLowerCase().trim();

  // STAT / once / single dose
  if (f === 'stat' || f === 'once' || f === 'single dose' || f === 'single') {
    return { intervalHours: 24, requiredDoses: 1 };
  }
  // Every N hours
  let m = f.match(/every\s+(\d+)\s*h/);
  if (m) {
    const h = parseInt(m[1]);
    return { intervalHours: h, requiredDoses: Math.max(1, Math.floor(24 / h)) };
  }
  m = f.match(/(\d+)\s*hourly/);
  if (m) {
    const h = parseInt(m[1]);
    return { intervalHours: h, requiredDoses: Math.max(1, Math.floor(24 / h)) };
  }
  // OD / once daily
  if (f === 'od' || f === 'once daily' || f === 'daily' || f === 'nocte' || f === 'mane' || f === 'om' || f === 'on') {
    return { intervalHours: 24, requiredDoses: 1 };
  }
  // BD / BID / twice daily
  if (f === 'bd' || f === 'bid' || f === 'twice daily' || f === 'twice a day' || f === 'b.i.d') {
    return { intervalHours: 12, requiredDoses: 2 };
  }
  // TDS / TID / thrice daily
  if (f === 'tds' || f === 'tid' || f === 'thrice daily' || f === 'three times a day' || f === 't.i.d') {
    return { intervalHours: 8, requiredDoses: 3 };
  }
  // QDS / QID / four times daily
  if (f === 'qds' || f === 'qid' || f === 'four times daily' || f === 'four times a day' || f === 'q.i.d') {
    return { intervalHours: 6, requiredDoses: 4 };
  }
  // PRN — as needed; don't materialize specific doses, use 1 placeholder
  if (f === 'prn' || f === 'as needed' || f === 'sos') {
    return { intervalHours: 24, requiredDoses: 1 };
  }

  // Unknown — best-effort fallback
  return { intervalHours: 24, requiredDoses: 1 };
}

async function main() {
  console.log(`🩺 Backfilling MedicationDose rows${DRY_RUN ? ' [DRY RUN]' : ''}`);

  // Find every medication that has JSON doses but no MedicationDose rows yet.
  const medications = await prisma.medication.findMany({
    where: {
      administeredDoses: { not: null },
      doses: { none: {} },
    },
    select: {
      id: true,
      name: true,
      dosage: true,
      route: true,
      frequency: true,
      prescribedAt: true,
      administeredDoses: true,
    },
  });

  console.log(`📋 Found ${medications.length} medications to backfill`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const med of medications) {
    try {
      const dosesJson = med.administeredDoses;

      // administeredDoses might be:
      // - an array of { doseNumber, administeredAt, administeredBy, ... }
      // - an object with the same shape
      // - a string (legacy)
      let parsedDoses = [];
      if (Array.isArray(dosesJson)) {
        parsedDoses = dosesJson;
      } else if (dosesJson && typeof dosesJson === 'object') {
        // Sometimes wrapped: { doses: [...] }
        if (Array.isArray(dosesJson.doses)) {
          parsedDoses = dosesJson.doses;
        } else {
          parsedDoses = [dosesJson];
        }
      } else if (typeof dosesJson === 'string') {
        try {
          const parsed = JSON.parse(dosesJson);
          parsedDoses = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          parsedDoses = [];
        }
      }

      if (parsedDoses.length === 0) {
        skipped++;
        continue;
      }

      const freq = parseFrequency(med.frequency);
      const prescribedAt = new Date(med.prescribedAt || new Date());
      const intervalMs = freq.intervalHours * 60 * 60 * 1000;

      // Build the rows
      const rows = parsedDoses.map((d, i) => {
        const doseNumber = Number(d.doseNumber) || i + 1;
        const administeredAt = d.administeredAt ? new Date(d.administeredAt) : null;
        const scheduledAt = new Date(prescribedAt.getTime() + (doseNumber - 1) * intervalMs);

        // Determine status: if there's an administeredAt, it was administered.
        // If it's marked missed, use missed. Otherwise scheduled.
        let status = 'scheduled';
        if (d.missed || d.status === 'missed') status = 'missed';
        else if (administeredAt) status = 'administered';

        return {
          medicationId: med.id,
          doseNumber,
          scheduledAt,
          administeredAt,
          status,
          dose: med.dosage || null,
          route: med.route || null,
          notes: typeof d.notes === 'string' ? d.notes : null,
          varianceReason: typeof d.reason === 'string' ? d.reason : null,
          // We don't have the User ID here in most cases — administeredBy in the
          // JSON is usually a name string, not an ID. Leave administeredById null
          // and rely on the notes field to carry the historic attribution.
          administeredById: null,
        };
      });

      if (DRY_RUN) {
        console.log(`  [dry] ${med.name} — would create ${rows.length} doses`);
        created += rows.length;
        continue;
      }

      await prisma.medicationDose.createMany({
        data: rows,
        skipDuplicates: true,
      });
      created += rows.length;
      console.log(`  ✅ ${med.name} — created ${rows.length} doses`);
    } catch (err) {
      errors++;
      console.error(`  ❌ ${med.name} (${med.id}):`, err.message);
    }
  }

  console.log('');
  console.log(`📊 Backfill complete${DRY_RUN ? ' [DRY RUN]' : ''}`);
  console.log(`   Medications processed: ${medications.length}`);
  console.log(`   Doses created:         ${created}`);
  console.log(`   Skipped (no doses):    ${skipped}`);
  console.log(`   Errors:                ${errors}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});