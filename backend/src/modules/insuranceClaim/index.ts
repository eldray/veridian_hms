import insuranceClaimRoutes from './insuranceClaim.routes';

export { insuranceClaimRoutes };

export default {
  path: '/insurance-claims',
  routes: insuranceClaimRoutes
};

// Helper function for module registration
export function createInsuranceClaimRoutes() {
  return insuranceClaimRoutes;
}
