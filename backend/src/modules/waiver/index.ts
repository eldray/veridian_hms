import waiverRoutes from './WaiverRoutes';

export { waiverRoutes };

export default {
  path: '/waivers',
  routes: waiverRoutes
};

// Helper function for module registration
export function createWaiverRoutes() {
  return waiverRoutes;
}
