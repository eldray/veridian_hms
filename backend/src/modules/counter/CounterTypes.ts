// Types for the counter (walk-in point of sale).
//
// A counter ticket is an Attendance whose identity is a CounterClient instead of a
// Patient. Everything downstream — lab order, scan order, dispensed drug, bill,
// payment, printed paper — is the same pipeline the clinical screens already use.

export interface CounterClientSummary {
  id: string;
  name: string;
  ageYears: number | null;
  phone: string | null;
  createdAt: Date;
  ticketCount: number;
  lastVisit: Date | null;
  registeredPatientId: string | null;
}

export interface CreateTicketInput {
  // Exactly one identity source: an already-registered patient, an existing counter
  // customer, or a new name captured at the counter.
  patientId?: string | null;
  clientId?: string | null;
  client?: { name: string; ageYears?: number | null; phone?: string | null } | null;
  reason?: string | null;
}

export interface CounterTicketFilters {
  query?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface AddSaleItemInput {
  stockItemId: string;
  quantity: number;
  notes?: string | null;
}

export interface AddOrderInput {
  serviceCatalogId?: string | null;
  templateId?: string | null;
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string | null;
}
