import api from './api';

export const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });

  // Your backend wraps in { success, data: { user, accessToken, refreshToken } }
  const payload = response.data?.data || response.data;

  const user = payload?.user;
  const accessToken = payload?.accessToken || payload?.token;
  const refreshToken = payload?.refreshToken; // ✅ capture refresh token

  if (!accessToken) {
    throw new Error('No authentication token received from server');
  }
  if (!user) {
    throw new Error('No user data received from server');
  }

  return { user, accessToken, refreshToken };
};

export const verifyToken = async () => {
  const response = await api.get('/auth/profile');
  const user =
    response.data?.data ||        // your backend returns { success, data: userObj }
    response.data?.user ||
    response.data;

  if (!user) throw new Error('Could not verify token');
  return user;
};

export const logout = async (refreshToken?: string) => {
  try {
    // Your backend logout requires refreshToken in body
    await api.post('/auth/logout', { refreshToken: refreshToken || '' });
  } catch {
    // Silent — always clear locally regardless
  }
};

export const getProfile = async () => {
  const response = await api.get('/auth/profile');
  return (
    response.data?.data ||
    response.data?.user ||
    response.data
  );
};

export const updateProfile = async (data: any) => {
  const response = await api.put('/auth/profile', data);
  return (
    response.data?.data ||
    response.data?.user ||
    response.data
  );
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string
) => {
  // Your backend uses POST not PUT for change-password
  const response = await api.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/auth/users');
  return (
    response.data?.data?.users ||
    response.data?.users ||
    response.data
  );
};

export const getUserStats = async () => {
  const response = await api.get('/auth/users/stats');
  return response.data;
};