import stockTransactionRoutes from './StockTransactionRoutes';

export { stockTransactionRoutes };

export default {
  path: '/stock-transactions',
  routes: stockTransactionRoutes
};

// Helper function for module registration
export function createStockTransactionRoutes() {
  return stockTransactionRoutes;
}
