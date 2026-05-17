import stockTransactionRoutes from './stockTransaction.routes';

export { stockTransactionRoutes };

export default {
  path: '/stock-transactions',
  routes: stockTransactionRoutes
};

// Helper function for module registration
export function createStockTransactionRoutes() {
  return stockTransactionRoutes;
}
