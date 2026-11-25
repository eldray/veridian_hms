import Dexie from 'dexie';
import api from './api';

// Initialize IndexedDB
const db = new Dexie('SavorySyncDB');

db.version(2).stores({
  menu: '++id, _id, name, description, price, image, category, createdAt, updatedAt',
  orders: '++id, _id, items, table, status, total, createdAt, updatedAt',
  offlineOrders: '++id, items, table, total, customer, tax, tip, paymentMethod, createdAt, synced',
  pendingActions: '++id, type, payload, endpoint, method, timestamp, retryCount'
});

// Enhanced caching with error handling
export const cacheMenu = async (items) => {
  try {
    await db.menu.clear();
    const menuWithId = items.map(item => ({
      ...item,
      id: item._id || item.id // Ensure we have a unique identifier
    }));
    await db.menu.bulkPut(menuWithId);
    console.log('Menu cached successfully:', items.length, 'items');
  } catch (error) {
    console.error('Error caching menu:', error);
    // Fallback to localStorage for critical data
    localStorage.setItem('cachedMenu', JSON.stringify(items));
  }
};

export const getCachedMenu = async () => {
  try {
    const cached = await db.menu.toArray();
    if (cached.length > 0) {
      return cached;
    }
    // Fallback to localStorage
    const fallback = localStorage.getItem('cachedMenu');
    return fallback ? JSON.parse(fallback) : [];
  } catch (error) {
    console.error('Error getting cached menu:', error);
    const fallback = localStorage.getItem('cachedMenu');
    return fallback ? JSON.parse(fallback) : [];
  }
};

export const cacheOrders = async (orders) => {
  try {
    await db.orders.clear();
    const ordersWithId = orders.map(order => ({
      ...order,
      id: order._id || order.id
    }));
    await db.orders.bulkPut(ordersWithId);
  } catch (error) {
    console.error('Error caching orders:', error);
  }
};

export const getCachedOrders = async () => {
  try {
    return await db.orders.toArray();
  } catch (error) {
    console.error('Error getting cached orders:', error);
    return [];
  }
};

export const queueOfflineOrder = async (orderData) => {
  try {
    const offlineOrder = {
      ...orderData,
      createdAt: new Date(),
      synced: false,
      offlineId: Date.now()
    };
    
    await db.offlineOrders.add(offlineOrder);
    
    // Also store in localStorage as backup
    const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
    pendingOrders.push(offlineOrder);
    localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
    
    return offlineOrder;
  } catch (error) {
    console.error('Error queueing offline order:', error);
    // Fallback to localStorage only
    const offlineOrder = {
      ...orderData,
      createdAt: new Date(),
      synced: false,
      offlineId: Date.now()
    };
    const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
    pendingOrders.push(offlineOrder);
    localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
    return offlineOrder;
  }
};

export const getOfflineOrders = async () => {
  try {
    const dbOrders = await db.offlineOrders.toArray();
    if (dbOrders.length > 0) return dbOrders;
    
    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('pendingOrders') || '[]');
  } catch (error) {
    console.error('Error getting offline orders:', error);
    return JSON.parse(localStorage.getItem('pendingOrders') || '[]');
  }
};

export const clearOfflineOrders = async () => {
  try {
    await db.offlineOrders.clear();
    localStorage.removeItem('pendingOrders');
  } catch (error) {
    console.error('Error clearing offline orders:', error);
  }
};

export const queuePendingAction = async (action) => {
  try {
    await db.pendingActions.add({
      ...action,
      timestamp: new Date(),
      retryCount: 0
    });
  } catch (error) {
    console.error('Error queueing pending action:', error);
  }
};

export const getPendingActions = async () => {
  try {
    return await db.pendingActions.toArray();
  } catch (error) {
    console.error('Error getting pending actions:', error);
    return [];
  }
};

// Enhanced sync function
export const syncOfflineOrders = async () => {
  if (isOffline()) return;
  
  try {
    // Sync offline orders
    const offlineOrders = await getOfflineOrders();
    const syncPromises = offlineOrders
      .filter(order => !order.synced)
      .map(async (order) => {
        try {
          await api.post('/orders', order);
          
          // Mark as synced in IndexedDB
          if (order.id) {
            await db.offlineOrders.update(order.id, { synced: true });
          }
          
          // Remove from localStorage backup
          const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
          const updatedPending = pendingOrders.filter(p => p.offlineId !== order.offlineId);
          localStorage.setItem('pendingOrders', JSON.stringify(updatedPending));
          
          console.log('Successfully synced order:', order.offlineId);
        } catch (error) {
          console.error('Failed to sync order:', order.offlineId, error);
          // Increment retry count or handle failure
          if (order.id) {
            await db.offlineOrders.update(order.id, { 
              lastSyncAttempt: new Date(),
              syncError: error.message 
            });
          }
        }
      });
    
    await Promise.allSettled(syncPromises);
    
    // Sync pending actions (status updates, etc.)
    const pendingActions = await getPendingActions();
    const actionPromises = pendingActions.map(async (action) => {
      try {
        await api({
          method: action.method,
          url: action.endpoint,
          data: action.payload
        });
        await db.pendingActions.delete(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        // Update retry count
        await db.pendingActions.update(action.id, { 
          retryCount: action.retryCount + 1,
          lastAttempt: new Date()
        });
      }
    });
    
    await Promise.allSettled(actionPromises);
    
    // Clear successfully synced orders
    await db.offlineOrders.where('synced').equals(true).delete();
    
    console.log('Offline sync completed');
  } catch (error) {
    console.error('Error during offline sync:', error);
  }
};

// Enhanced offline detection
export const isOffline = () => {
  return !navigator.onLine;
};

// Network status monitoring
export const getNetworkStatus = () => {
  return {
    online: navigator.onLine,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : null
  };
};

// Initialize database and sync on app start
export const initializeOfflineCache = async () => {
  try {
    // Test database connection
    await db.open();
    console.log('Offline cache initialized');
    
    // Attempt sync if online
    if (!isOffline()) {
      setTimeout(syncOfflineOrders, 2000); // Delay to ensure app is loaded
    }
  } catch (error) {
    console.error('Error initializing offline cache:', error);
  }
};

// Export db for direct access if needed
export { db };