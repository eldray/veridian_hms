// src/api/api.ts - COMPLETE FIXED VERSION
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ✅ COMPREHENSIVE DATA TRANSFORMATION UTILITIES
const DataTransformer = {
  /**
   * Transform backend 'id' to frontend '_id' and ensure consistency
   */
  transformIds: (data: any): any => {
    if (!data) return data;
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => DataTransformer.transformIds(item));
    }
    
    // Handle objects
    if (typeof data === 'object' && data !== null) {
      const transformed: any = {};
      
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          
          // Transform 'id' to '_id' while keeping original
          if (key === 'id') {
            transformed._id = value;
            transformed.id = value; // Keep both for compatibility
          } 
          // Transform nested objects and arrays
          else if (typeof value === 'object' && value !== null) {
            transformed[key] = DataTransformer.transformIds(value);
          } 
          // Keep primitive values as-is
          else {
            transformed[key] = value;
          }
        }
      }
      
      // Ensure _id exists if id exists
      if (data.id && !data._id) {
        transformed._id = data.id;
      }
      
      return transformed;
    }
    
    // Return primitives as-is
    return data;
  },

  /**
   * Transform frontend '_id' back to backend 'id' for requests
   */
  reverseTransformIds: (data: any): any => {
    if (!data) return data;
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => DataTransformer.reverseTransformIds(item));
    }
    
    // Handle objects
    if (typeof data === 'object' && data !== null) {
      const transformed: any = {};
      
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          
          // Transform '_id' to 'id' for backend
          if (key === '_id') {
            transformed.id = value;
          } 
          // Don't include _id in requests to backend
          else if (key !== '_id') {
            // Transform nested objects and arrays
            if (typeof value === 'object' && value !== null) {
              transformed[key] = DataTransformer.reverseTransformIds(value);
            } 
            // Keep primitive values as-is
            else {
              transformed[key] = value;
            }
          }
        }
      }
      
      return transformed;
    }
    
    // Return primitives as-is
    return data;
  },

  /**
   * Normalize common response formats from backend
   */
  normalizeResponse: (response: any): any => {
    if (!response) return response;
    
    // Handle different backend response formats
    let data = response;
    
    // Format 1: { data: [], pagination: {} }
    if (response.data !== undefined && Array.isArray(response.data)) {
      data = response.data;
    }
    // Format 2: { attendances: [], pagination: {} }
    else if (response.attendances !== undefined && Array.isArray(response.attendances)) {
      data = response.attendances;
    }
    // Format 3: { patients: [], pagination: {} }
    else if (response.patients !== undefined && Array.isArray(response.patients)) {
      data = response.patients;
    }
    // Format 4: { vitals: [] }
    else if (response.vitals !== undefined && Array.isArray(response.vitals)) {
      data = response.vitals;
    }
    // Format 5: Direct array
    else if (Array.isArray(response)) {
      data = response;
    }
    
    // Apply ID transformation
    return DataTransformer.transformIds(data);
  }
};

// Request interceptor to add auth token and transform data
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    console.log('🔐 API Request:', {
      url: config.url,
      method: config.method,
      token: token ? 'present' : 'missing'
    });
    
    // Only add token if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Transform request data for backend (convert _id to id)
    if (config.data) {
      console.log('🔄 Transforming request data for backend');
      config.data = DataTransformer.reverseTransformIds(config.data);
      
      // Log transformed data for debugging
      console.log('📤 Request data after transformation:', {
        originalKeys: Object.keys(config.data),
        hasId: 'id' in config.data,
        has_id: '_id' in config.data
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and transform data
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', {
      url: response.config.url,
      status: response.status,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data)
    });
    
    // Transform response data for frontend (convert id to _id)
    if (response.data) {
      console.log('🔄 Transforming response data for frontend');
      
      const originalData = response.data;
      response.data = DataTransformer.normalizeResponse(response.data);
      
      // Log transformation details for debugging
      console.log('📥 Response transformation:', {
        originalType: Array.isArray(originalData) ? 'array' : 'object',
        transformedType: Array.isArray(response.data) ? 'array' : 'object',
        originalLength: Array.isArray(originalData) ? originalData.length : 'N/A',
        transformedLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        sampleItem: Array.isArray(response.data) && response.data.length > 0 ? {
          keys: Object.keys(response.data[0]),
          hasId: 'id' in response.data[0],
          has_id: '_id' in response.data[0]
        } : 'N/A'
      });
    }
    
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data
    });
    
    // Log validation errors in detail
    if (error.response?.status === 400) {
      console.error('🔍 400 Bad Request Details:', {
        validationErrors: error.response?.data?.errors,
        message: error.response?.data?.message,
        fullResponse: error.response?.data
      });
    }
    
    const isAuthRoute = error.config?.url?.includes('/auth/');

    // Handle 401 errors ONLY for non-auth routes
    if (error.response?.status === 401 && !isAuthRoute) {
      console.warn('🚨 401 Unauthorized on protected route - Clearing auth data');
      
      // Clear all auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Only redirect if we're not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;