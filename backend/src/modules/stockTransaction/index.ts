import { createStockTransactionRoutes as buildStockTransactionRoutes } from './StockTransactionRoutes';

export const stockTransactionRoutes = buildStockTransactionRoutes();

export default {
  path: '/stock-transactions',
  routes: stockTransactionRoutes
};

export function createStockTransactionRoutes() {
  return buildStockTransactionRoutes();
}
