import { createStockItemRoutes as buildStockItemRoutes } from './StockItemRoutes';

export const stockItemRoutes = buildStockItemRoutes();

export default {
  path: '/stock-items',
  routes: stockItemRoutes
};

export function createStockItemRoutes() {
  return buildStockItemRoutes();
}
