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
  try {
    const response = await api.get('/auth/verify');
    const { user, token } = response.data;

    // Re-store token if server sends fresh one (optional)
    if (token) {
      localStorage.setItem('auth_token', token);
    }

    return user;
  } catch (error: any) {
    // Don't log out here — let interceptor handle 401
    throw error;
  }
};

export const logout = async () => {
  localStorage.removeItem('auth_token');
  // Optional: tell backend
  try {
    await api.post('/auth/logout');
  } catch (err) {
    console.warn('Logout API failed (OK)');
  }
};

export const getDemoUsers = () => [
  { username: 'admin', password: 'admin123', role: 'admin' as const },
  { username: 'doctor1', password: 'doctor123', role: 'doctor' as const },
  { username: 'nurse1', password: 'nurse123', role: 'nurse' as const },
  { username: 'pharma1', password: 'pharma123', role: 'pharmacist' as const },
];
