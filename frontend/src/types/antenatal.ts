// types/antenatal.ts - Type definitions for antenatal module

export interface AntenatalFilters {
  patientId?: string;
  status?: 'BOOKED' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';
  gestationalAgeFrom?: number;
  gestationalAgeTo?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AntenatalStats {
  totalBookings: number;
  activePatients: number;
  completedPregnancies: number;
  highRiskPatients: number;
  upcomingDeliveries: number;
}

export interface ANCReport {
  period: string;
  totalBookings: number;
  totalVisits: number;
  deliveries: number;
  complications: number;
}

export interface BookingData {
  patientId: string;
  lmp: string;
  edd: string;
  gravida: number;
  parity: number;
  riskFactors?: string[];
}

export interface VisitData {
  bookingId: string;
  gestationalAge: number;
  weight: number;
  bpSystolic: number;
  bpDiastolic: number;
  fundalHeight?: number;
  fetalHeartRate?: number;
  notes?: string;
}
