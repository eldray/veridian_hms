// src/api/auth.ts
import api from './api';

export const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });
  const { user, accessToken, token } = response.data;
  
  const finalToken = accessToken || token;
  
  if (finalToken) {
    localStorage.setItem('auth_token', finalToken);
  }

  return { user, token: finalToken };
};

export const verifyToken = async () => {
  const response = await api.get('/auth/profile');
  return response.data.user || response.data;
};

export const logout = async () => {
  localStorage.removeItem('auth_token');
  try {
    await api.post('/auth/logout');
  } catch (err) {
    // Silent fail
  }
};

export const getProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data.user || response.data;
};

export const updateProfile = async (data: any) => {
  const response = await api.put('/auth/profile', data);
  return response.data.user || response.data;
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await api.post('/auth/change-password', { currentPassword, newPassword });
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/auth/users');
  return response.data.users || response.data;
};

export const getUserStats = async () => {
  const response = await api.get('/auth/users/stats');
  return response.data;
};