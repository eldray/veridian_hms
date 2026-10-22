import { createSettingsRoutes as buildSettingsRoutes } from './SettingsRoutes';

export const settingsRoutes = buildSettingsRoutes();

export default {
  path: '/settings',
  routes: settingsRoutes
};

export function createSettingsRoutes() {
  return buildSettingsRoutes();
}
