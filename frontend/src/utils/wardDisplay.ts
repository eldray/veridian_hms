/**
 * Resolve ward and bed labels from the relation shapes returned by attendance
 * and admission endpoints. Internal IDs are never used as display names.
 */
const textValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export const getWardName = (...sources: any[]): string | undefined => {
  for (const source of sources) {
    const candidates = [
      source?.Ward?.wardName, source?.ward?.wardName,
      source?.Bed?.Ward?.wardName, source?.Bed?.ward?.wardName,
      source?.bed?.Ward?.wardName, source?.bed?.ward?.wardName,
      source?.attendance?.Ward?.wardName, source?.attendance?.ward?.wardName,
      source?.attendance?.Bed?.Ward?.wardName, source?.attendance?.Bed?.ward?.wardName,
      source?.attendance?.bed?.Ward?.wardName, source?.attendance?.bed?.ward?.wardName,
      source?.wardName,
    ];
    for (const candidate of candidates) {
      const name = textValue(candidate);
      if (name) return name;
    }
  }
  return undefined;
};

export const getBedNumber = (...sources: any[]): string | undefined => {
  for (const source of sources) {
    const candidates = [
      source?.Bed?.bedNumber, source?.bed?.bedNumber,
      source?.attendance?.Bed?.bedNumber, source?.attendance?.bed?.bedNumber,
      source?.bedNumber,
    ];
    for (const candidate of candidates) {
      const number = textValue(candidate);
      if (number) return number;
    }
  }
  return undefined;
};

export const getWardId = (...sources: any[]): string | undefined => {
  for (const source of sources) {
    const candidates = [
      source?.wardId, source?.Ward?.id, source?.ward?.id,
      source?.Bed?.wardId, source?.Bed?.Ward?.id,
      source?.bed?.wardId, source?.bed?.Ward?.id,
      source?.attendance?.wardId, source?.attendance?.Ward?.id,
      source?.attendance?.Bed?.wardId,
    ];
    for (const candidate of candidates) {
      const id = textValue(candidate);
      if (id) return id;
    }
  }
  return undefined;
};
