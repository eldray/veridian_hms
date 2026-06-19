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

// 4. Import Routes for registration
import insuranceClaimRoutes from './InsuranceClaimRoutes';

// Helper function for module registration
export function createInsuranceClaimRoutes() {
  return insuranceClaimRoutes;
}

// Default export for easy route registration in your main app.ts/index.ts
export default {
  path: '/insurance-claims',
  routes: insuranceClaimRoutes
};