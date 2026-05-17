/**
 * Ward Types
 * Type definitions for Ward module
 */

import { Gender } from '@prisma/client';

export interface Ward {
  id: string;
  wardName: string;
  wardType: string;
  totalBeds: number;
  occupiedBeds: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bed {
  id: string;
  bedNumber: string;
  wardId: string;
  isOccupied: boolean;
  patientId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWardDTO {
  wardName: string;
  wardType: string;
  totalBeds: number;
}

export interface UpdateWardDTO {
  wardName?: string;
  wardType?: string;
  totalBeds?: number;
  isActive?: boolean;
}

export interface WardFilters {
  isActive?: boolean;
  wardType?: string;
  hasAvailableBeds?: boolean;
  page?: number;
  limit?: number;
}

export interface WardWithAvailability extends Ward {
  availableBeds: number;
  occupancyRate: number;
  hasPricing?: boolean;
  beds?: Bed[];
}

export interface AvailableBedResponse {
  bedId: string;
  bedNumber: string;
  wardId: string;
  wardName: string;
  wardType: string;
  isWardActive: boolean;
}

export interface WardStats {
  totalWards: number;
  activeWards: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
}
