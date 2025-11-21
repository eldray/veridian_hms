// src/api/api.ts - FIXED VERSION (REMOVED ID TRANSFORM + BLOB FIX)
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor to add auth token
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
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors - FIXED FOR BLOB RESPONSES
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', {
      url: response.config.url,
      status: response.status,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      responseType: response.config.responseType
    });
    
    // ✅ FIX: Skip transformation for blob responses (file downloads)
    if (response.config.responseType === 'blob') {
      console.log('📦 Blob response detected - skipping transformation');
      return response;
    }
    
    // Only transform JSON responses
    if (response.data && typeof response.data === 'object') {
      console.log('🔄 Processing JSON response data');
      
      // Handle different backend response formats
      let normalizedData = response.data;
      
      // Format 1: { data: [], pagination: {} }
      if (response.data.data !== undefined && Array.isArray(response.data.data)) {
        normalizedData = response.data.data;
      }
      // Format 2: { attendances: [], pagination: {} }
      else if (response.data.attendances !== undefined && Array.isArray(response.data.attendances)) {
        normalizedData = response.data.attendances;
      }
      // Format 3: { patients: [], pagination: {} }
      else if (response.data.patients !== undefined && Array.isArray(response.data.patients)) {
        normalizedData = response.data.patients;
      }
      // Format 4: { vitals: [] }
      else if (response.data.vitals !== undefined && Array.isArray(response.data.vitals)) {
        normalizedData = response.data.vitals;
      }
      // Format 5: Direct array or object
      else if (Array.isArray(response.data) || typeof response.data === 'object') {
        normalizedData = response.data;
      }
      
      response.data = normalizedData;
      
      console.log('📥 Response processed:', {
        originalType: Array.isArray(response.data) ? 'array' : 'object',
        length: Array.isArray(response.data) ? response.data.length : 'N/A'
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