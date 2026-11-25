/**
 * Insurance Claim Module
 * Exports all components for NHIS, Private, and Corporate claims management
 */

// 1. Export Controller & Instance
export { InsuranceClaimController, insuranceClaimController } from './InsuranceClaimController';

// 2. Export Service & Repository
export { InsuranceClaimService } from './InsuranceClaimService';
export { InsuranceClaimRepository } from './InsuranceClaimRepository';

// 3. Export all Types/DTOs
export * from './InsuranceClaimTypes';

// 4. Export Routes for registration
export { createInsuranceClaimRoutes } from './InsuranceClaimRoutes';