/**
 * Patient Module
 * Exports all patient module components
 */

export { PatientController } from './PatientController';
export { PatientService } from './PatientService';
export { PatientRepository } from './PatientRepository';
export { createPatientRoutes } from './PatientRoutes';

export type { 
  CreatePatientDTO, 
  UpdatePatientDTO, 
  PatientFilters, 
  PatientSummary,
  PatientResponse 
} from './PatientTypes';
