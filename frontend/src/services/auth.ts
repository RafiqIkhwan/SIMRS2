import api from './api';
import type { ApiResponse, LoginResponse, AuthUser } from '../types';

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
      username,
      password,
    });
    if (data.data?.csrfToken) {
      sessionStorage.setItem('csrfToken', data.data.csrfToken);
    }
    return data.data!;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    sessionStorage.removeItem('csrfToken');
  },

  getMe: async (): Promise<{ user: AuthUser; csrfToken: string }> => {
    const { data } = await api.get<ApiResponse<{ user: AuthUser; csrfToken: string }>>('/auth/me');
    if (data.data?.csrfToken) {
      sessionStorage.setItem('csrfToken', data.data.csrfToken);
    }
    return data.data!;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { oldPassword, newPassword });
  },
};
