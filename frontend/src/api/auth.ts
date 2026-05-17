// src/api/auth.ts
import api from './api';

export const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });
  const { user, token } = response.data;

  if (token) {
    localStorage.setItem('auth_token', token);
  }

  return { user, token };
};

export const verifyToken = async () => {
  const response = await api.get('/auth/profile');
  return response.data.user || response.data;
};

export const logout = async () => {
  // Remove token first to prevent any further authenticated requests
  localStorage.removeItem('auth_token');
  
  // Optional: notify backend (but don't block on it)
  try {
    await api.post('/auth/logout');
  } catch (err) {
    // Silent fail - user is logged out regardless
  }
};

export const getDemoUsers = () => [
  { username: 'admin', password: 'admin123', role: 'admin' as const },
  { username: 'doctor1', password: 'doctor123', role: 'doctor' as const },
  { username: 'nurse1', password: 'nurse123', role: 'nurse' as const },
  { username: 'pharma1', password: 'pharma123', role: 'pharmacist' as const },
];

// Profile management
export const getProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data.user || response.data;
};

export const updateProfile = async (data: any) => {
  const response = await api.put('/auth/profile', data);
  return response.data.user || response.data;
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await api.put('/auth/change-password', { currentPassword, newPassword });
  return response.data;
};

// User management (admin)
export const getUsers = async () => {
  const response = await api.get('/auth/users');
  return response.data.users || response.data;
};

export const getUserStats = async () => {
  const response = await api.get('/auth/users/stats');
  return response.data;
};
