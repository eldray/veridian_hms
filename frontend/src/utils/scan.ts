// Scan display helpers.
//
// `Scan.scanType` holds the imaging modality (plain / contrast / doppler), not the study the
// clinician ordered — the name only exists on the ScanTemplate / ServiceCatalog relation. Every
// screen must resolve them separately, otherwise an ordered "Abdominal Ultrasound" renders as
// "plain".

const UNKNOWN_SCAN = 'Unknown Scan';

const firstString = (...values: any[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

/** The study as ordered, e.g. "Abdominal Ultrasound". Never the modality. */
export function getScanDisplayName(scan: any): string {
  if (!scan) return UNKNOWN_SCAN;
  return (
    firstString(
      scan.ScanTemplate?.name,
      scan.scanTemplate?.name,
      scan.templateName,
      scan.ServiceCatalog?.name,
      scan.serviceCatalog?.name,
      scan.name,
      // Legacy rows written before the template link existed store the name in `scanType`.
      scan.scanType,
    ) ?? UNKNOWN_SCAN
  );
}

/** The imaging modality — plain / contrast / doppler — as the technician reads it. */
export function getScanModality(scan: any): string | undefined {
  const name = getScanDisplayName(scan);
  const modality = firstString(
    scan?.modality,
    scan?.ScanTemplate?.scanType,
    scan?.scanTemplate?.scanType,
    scan?.ServiceCatalog?.metadata?.scanType,
    scan?.serviceCatalog?.metadata?.scanType,
    scan?.scanType,
  );
  // A row whose only text is the study name has no modality to show.
  if (!modality || modality === name) return undefined;
  return modality;
}

export function humanScanModality(scan: any): string {
  const modality = getScanModality(scan);
  if (!modality) return '—';
  return modality.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
