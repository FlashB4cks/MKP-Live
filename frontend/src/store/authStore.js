import { create } from 'zustand';
import api from '../api/client';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('access_token') || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login/', { username, password });
      const { user, access, refresh } = res.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token: access, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al iniciar sesión';
      set({ error: errorMsg, loading: false });
      return { success: false, error: errorMsg };
    }
  },

  register: async (username, email, password, password2) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/register/', {
        username,
        email,
        password,
        password2,
      });
      const { user, access, refresh } = res.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token: access, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (err) {
      let errorMsg = 'Error en el registro';
      if (err.response?.data) {
        const errors = Object.values(err.response.data).flat();
        errorMsg = errors.join(' ') || errorMsg;
      }
      set({ error: errorMsg, loading: false });
      return { success: false, error: errorMsg };
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const res = await api.get('/auth/me/');
      localStorage.setItem('user', JSON.stringify(res.data));
      set({ user: res.data });
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  },
}));
