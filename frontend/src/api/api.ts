// src/api/api.ts - IMPROVED VERSION
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
    
    console.log('🔐 API Request:', config.url, 'Token:', token ? 'present' : 'missing');
    
    // Only add token if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
    });
    
    const isAuthRoute = error.config?.url?.includes('/auth/');

    // Handle 401 errors ONLY for non-auth routes
    if (error.response?.status === 401 && !isAuthRoute) {
      console.warn('🚨 401 Unauthorized on protected route - Clearing auth data');
      
      // Clear all auth data
      localStorage.removeItem('auth_token');
      
      // Only redirect if we're not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
