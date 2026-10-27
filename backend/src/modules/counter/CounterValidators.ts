import { z } from 'zod';

// The counter takes money and hands out drugs, tests and reports for people who are
// not in the clinical register. These schemas are the first guard that a ticket always
// has exactly one identity and that a quantity is a real positive whole number — a
// NaN quantity used to reach Prisma as a 500 and leave a half-sold basket behind.
const trimmed = (max: number) => z.string().trim().max(max);

export const CreateTicketSchema = z
  .object({
    patientId: z.string().min(1).nullish(),
    clientId: z.string().min(1).nullish(),
    client: z
      .object({
        name: trimmed(200).min(1, 'A name is required'),
        // A walk-in gives an age, not a date of birth. Nothing is invented for them.
        ageYears: z.coerce.number().int().min(0).max(120).nullish(),
        phone: trimmed(40).nullish(),
      })
      .nullish(),
    reason: trimmed(500).nullish(),
  })
  .refine(
    (value) => [value.patientId, value.clientId, value.client].filter(Boolean).length === 1,
    { message: 'Choose a registered patient, an existing counter customer, or a new name', path: ['client'] },
  );

export const AddSaleItemSchema = z.object({
  stockItemId: z.string().min(1, 'Select the medicine or consumable'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10_000),
  notes: trimmed(1000).nullish(),
});

export const AddLabOrderSchema = z
  .object({
    serviceCatalogId: z.string().min(1).nullish(),
    templateId: z.string().min(1).nullish(),
    priority: z.enum(['routine', 'urgent', 'stat']).nullish(),
    notes: trimmed(2000).nullish(),
  })
  .refine((value) => Boolean(value.serviceCatalogId || value.templateId), {
    message: 'Select the laboratory test from the service list',
    path: ['serviceCatalogId'],
  });

// Imaging has no 'stat' in its own priority scale, so the counter must not accept one.
export const AddScanOrderSchema = z
  .object({
    serviceCatalogId: z.string().min(1).nullish(),
    templateId: z.string().min(1).nullish(),
    priority: z.enum(['routine', 'urgent']).nullish(),
    notes: trimmed(2000).nullish(),
  })
  .refine((value) => Boolean(value.serviceCatalogId || value.templateId), {
    message: 'Select the imaging study from the service list',
    path: ['serviceCatalogId'],
  });

// The batch and its expiry come from the pharmacy's own earliest-expiry allocation in
// EncounterRepository.updateMedication; the counter must not accept either from the browser.
export const DispenseItemSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10_000),
});

export const LinkClientSchema = z.object({
  patientId: z.string().min(1, 'Select the patient folder this customer was registered under'),
});
