/**
 * Patient Module Type Definitions
 */

import { Patient, Gender, MaritalStatus } from '@prisma/client';

export interface CreatePatientDTO {
  firstName: string;
  lastName: string;
  otherName?: string;
  dateOfBirth: Date | string;
  gender: Gender;
  nhisNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  maritalStatus?: MaritalStatus;
  occupation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  bloodGroup?: string;
  genotype?: string;
  religion?: string;
  nationality?: string;
  photoUrl?: string;
}

export interface UpdatePatientDTO extends Partial<CreatePatientDTO> {}

export interface PatientFilters {
  search?: string;
  nhisNumber?: string;
  phone?: string;
  email?: string;
  gender?: Gender;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  page?: number;
  limit?: number;
}

export interface PatientSummary {
  id: string;
  patientId: string;
  fullName: string;
  age: number;
  gender: Gender;
  nhisNumber?: string;
  phone?: string;
  lastVisit?: Date;
}

export type PatientResponse = Patient & {
  age: number;
  fullName: string;
};
