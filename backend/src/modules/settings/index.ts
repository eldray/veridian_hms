import settingsRoutes from './SettingsRoutes';

export { settingsRoutes };

export default {
  path: '/settings',
  routes: settingsRoutes
};

// Helper function for module registration
export function createSettingsRoutes() {
  return settingsRoutes;
}
