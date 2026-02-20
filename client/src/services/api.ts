import axios from 'axios';
import type { UnsplashImage, ImageAttribution } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(orig);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Image API methods
export const imageApi = {
  search: async (params: {
    q: string;
    page?: number;
    per_page?: number;
    orientation?: 'landscape' | 'portrait' | 'squarish';
  }) => {
    const response = await api.get('/images/search', { params });
    return response.data as { data: UnsplashImage[]; meta: { total: number; total_pages: number; page: number; per_page: number } };
  },

  getById: async (id: string) => {
    const response = await api.get(`/images/${id}`);
    return response.data as { data: UnsplashImage };
  },

  getAttribution: async (id: string, format: 'html' | 'text' = 'html') => {
    const response = await api.get(`/images/${id}/attribution`, { params: { format } });
    return response.data as { data: ImageAttribution };
  },
};

export default api;
