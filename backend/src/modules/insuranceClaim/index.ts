// modules/insuranceClaim/index.ts
export { InsuranceClaimController, insuranceClaimController } from './insuranceClaim.controller';
export * from './insuranceClaim.service';
import insuranceClaimRoutes from './insuranceClaim.routes';

// Helper function for module registration
export function createInsuranceClaimRoutes() {
  return insuranceClaimRoutes;
}

export default {
  path: '/insurance-claims',
  routes: insuranceClaimRoutes
};