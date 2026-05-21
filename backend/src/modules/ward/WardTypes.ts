/**
 * Ward Types
 * Type definitions for Ward module matching Prisma schema
 */

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
  dailyCashRate: number;
  dailyNHISRate: number;
  dailyInsuranceRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bed {
  id: string;
  bedNumber: string;
  wardId: string;
  isOccupied: boolean;
  currentPatientId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWardDTO {
  wardName: string;
  wardType: string;
  totalBeds: number;
  // Pricing fields
  dailyCashRate: number;
  dailyNHISRate?: number;
  dailyInsuranceRate?: number;
  // Coverage flags
  isNHISCovered?: boolean;
  nhisRequiresAuth?: boolean;
  isPrivateInsExempted?: boolean;
  requiresAuthorization?: boolean;
  // Tax fields
  vatRate?: number;
  isTaxable?: boolean;
  tariffCode?: string;
}

export interface UpdateWardDTO {
  wardName?: string;
  wardType?: string;
  totalBeds?: number;
  isActive?: boolean;
  // Pricing fields
  dailyCashRate?: number;
  dailyNHISRate?: number;
  dailyInsuranceRate?: number;
  // Coverage flags
  isNHISCovered?: boolean;
  nhisRequiresAuth?: boolean;
  isPrivateInsExempted?: boolean;
  requiresAuthorization?: boolean;
  // Tax fields
  vatRate?: number;
  isTaxable?: boolean;
  tariffCode?: string;
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
  // Pricing by payment mode
  pricingByPaymentMode: {
    [PaymentMode.CASH]: number;
    [PaymentMode.NHIS]: number;
    [PaymentMode.PRIVATE_INSURANCE]: number;
    [PaymentMode.CORPORATE]: number;
  };
}

export interface AvailableBedResponse {
  bedId: string;
  bedNumber: string;
  wardId: string;
  wardName: string;
  wardType: string;
  isWardActive: boolean;
  dailyRates: {
    cash: number;
    nhis: number;
    insurance: number;
    corporate: number;
  };
}

export interface WardStats {
  totalWards: number;
  activeWards: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  byPaymentMode: {
    totalNHISCovered: number;
    totalPrivateInsuranceCovered: number;
    totalCashOnly: number;
  };
  revenueProjection: {
    dailyAtFullOccupancy: number;
    monthlyAtFullOccupancy: number;
  };
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