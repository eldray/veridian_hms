import { createWaiverRoutes as buildWaiverRoutes } from './WaiverRoutes';

export const waiverRoutes = buildWaiverRoutes();

export default {
  path: '/waivers',
  routes: waiverRoutes
};

export function createWaiverRoutes() {
  return buildWaiverRoutes();
}
