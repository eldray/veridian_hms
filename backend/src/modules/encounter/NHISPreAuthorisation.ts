/**
 * Fail-closed matcher for approved NHIS pre-authorisation service payloads.
 *
 * Approval must identify the exact stock item or medication service. A generic
 * approval, a requested-services entry, or a text-only description is not enough
 * to prove that this prescription was authorised.
 */
export type NHISPrescriptionIdentity = {
  stockItemId: string;
  serviceCatalogId: string;
};

const SERVICE_COLLECTION_KEYS = ['services', 'items', 'approvedServices', 'medicines', 'medications'] as const;
const STOCK_ID_KEYS = ['stockItemId', 'stock_item_id', 'medicineStockItemId'] as const;
const SERVICE_ID_KEYS = ['serviceCatalogId', 'service_catalog_id', 'medicationServiceId'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectApprovedEntries(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 4) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (isRecord(item)) return [item, ...collectApprovedEntries(item, depth + 1)];
      return [];
    });
  }
  if (!isRecord(value)) return [];
  const entries: Record<string, unknown>[] = [value];
  for (const key of SERVICE_COLLECTION_KEYS) {
    if (key in value) entries.push(...collectApprovedEntries(value[key], depth + 1));
  }
  return entries;
}

function matchesAny(entry: Record<string, unknown>, keys: readonly string[], expected: string): boolean {
  // Empty identifiers are missing data, not identities. In particular, never
  // let an empty serviceCatalogId accidentally match an empty payload field.
  if (!expected) return false;
  return keys.some((key) => typeof entry[key] === 'string' && entry[key] === expected);
}

/**
 * Returns true only when the approved payload explicitly identifies this exact
 * stock item or its medication service. Unrecognised payload shapes fail closed.
 */
const APPROVED_QUANTITY_KEYS = [
  'approvedQuantity', 'approved_quantity', 'maxQuantity', 'maximumQuantity', 'quantity', 'qty',
] as const;

/**
 * If an approval explicitly records a quantity, the prescription/claim must not
 * exceed it. Older approvals that identify a service but contain no quantity
 * remain compatible; malformed or non-positive explicit quantities fail closed.
 */
function approvedQuantityCoversPrescription(entry: Record<string, unknown>, requestedQuantity?: number): boolean {
  if (requestedQuantity === undefined) return true;
  if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity <= 0) return false;
  const quantityKey = APPROVED_QUANTITY_KEYS.find((key) => key in entry);
  if (!quantityKey) return true;
  const approvedQuantity = Number(entry[quantityKey]);
  return Number.isSafeInteger(approvedQuantity) && approvedQuantity > 0 && approvedQuantity >= requestedQuantity;
}

export function approvedServicesCoverPrescription(
  approvedServices: unknown,
  prescription: NHISPrescriptionIdentity,
  requestedQuantity?: number,
): boolean {
  if (!approvedServices) return false;
  return collectApprovedEntries(approvedServices).some((entry) => {
    const matchesPrescription =
      matchesAny(entry, STOCK_ID_KEYS, prescription.stockItemId) ||
      matchesAny(entry, SERVICE_ID_KEYS, prescription.serviceCatalogId);
    return matchesPrescription && approvedQuantityCoversPrescription(entry, requestedQuantity);
  });
}
