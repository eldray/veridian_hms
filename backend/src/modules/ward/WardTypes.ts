import { PaymentMode } from '@prisma/client';

export interface Ward {
  id: string;
  wardName: string;
  wardType: string;
  totalBeds: number;
  occupiedBeds: number;
  isNHISCovered: boolean;
  nhisRequiresAuth: boolean;
  isPrivateInsExempted: boolean;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode: string | null;
  vatRate: number;
  isTaxable: boolean;
  dailyCashRate: any; // Decimal
  dailyNHISRate: any; // Decimal
  dailyInsuranceRate: any; // Decimal
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ FIXED: Removed currentPatientId to match schema
export interface Bed {
  id: string;
  bedNumber: string;
  wardId: string;
  isOccupied: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWardDTO {
  wardName: string;
  wardType: string;
  totalBeds: number;
  dailyCashRate: number;
  dailyNHISRate?: number;
  dailyInsuranceRate?: number;
  isNHISCovered?: boolean;
  nhisRequiresAuth?: boolean;
  isPrivateInsExempted?: boolean;
  requiresAuthorization?: boolean;
  vatRate?: number;
  isTaxable?: boolean;
  tariffCode?: string;
}

export interface UpdateWardDTO extends Partial<CreateWardDTO> {
  isActive?: boolean;
}

export interface WardFilters {
  isActive?: boolean;
  wardType?: string;
  hasAvailableBeds?: boolean;
  isNHISCovered?: boolean;
  page?: number;
  limit?: number;
}

export interface WardWithAvailability extends Ward {
  availableBeds: number;
  occupancyRate: number;
  beds?: Bed[];
  currentAdmissions?: number;
  pricingByPaymentMode: {
    [PaymentMode.cash]: number;
    [PaymentMode.nhis]: number;
    [PaymentMode.private_insurance]: number;
    [PaymentMode.corporate]: number;
  };
}

export interface AvailableBedResponse {
  bedId: string;
  bedNumber: string;
  wardId: string;
  wardName: string;
  wardType: string;
  isWardActive: boolean;
  dailyRates: { cash: number; nhis: number; insurance: number; corporate: number; };
}

export interface WardChargeCalculation {
  wardId: string;
  wardName: string;
  dailyRate: number;
  numberOfDays: number;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  paymentMode: PaymentMode;
}

export interface WardStats {
  totalWards: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
}