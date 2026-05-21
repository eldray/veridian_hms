import stockItemRoutes from './stockItem.routes';

export { stockItemRoutes };

export default {
  path: '/stock-items',
  routes: stockItemRoutes
};

// Helper function for module registration
export function createStockItemRoutes() {
  return stockItemRoutes;
}