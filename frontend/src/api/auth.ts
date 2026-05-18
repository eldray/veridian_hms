// src/api/auth.ts
import api from './api';

export const login = async (username: string, password: string) => {
  console.log('📤 1. Sending login request...');
  const response = await api.post('/auth/login', { username, password });
  console.log('📥 2. Full response:', response);
  console.log('📥 3. response.data:', response.data);
  
  // ✅ The token is inside response.data.data.accessToken
  const data = response.data;
  const user = data?.data?.user;
  const accessToken = data?.data?.accessToken;
  
  console.log('👤 4. Extracted user:', user);
  console.log('🔑 5. Extracted accessToken:', accessToken);
  
  if (accessToken) {
    localStorage.setItem('auth_token', accessToken);
    console.log('💾 6. Token saved to localStorage');
  } else {
    console.error('❌ 7. No token found!');
  }

  // ✅ Return in the format the store expects
  return { user, token: accessToken };
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