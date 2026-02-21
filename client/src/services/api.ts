import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Token refresh state management
interface RefreshState {
  isRefreshing: boolean;
  refreshPromise: Promise<string> | null;
  refreshSubscribers: Array<(token: string) => void>;
}

const refreshState: RefreshState = {
  isRefreshing: false,
  refreshPromise: null,
  refreshSubscribers: [],
};

const subscribeTokenRefresh = (cb: (token: string) => void): void => {
  refreshState.refreshSubscribers.push(cb);
};

const notifySubscribers = (token: string): void => {
  refreshState.refreshSubscribers.forEach((cb) => cb(token));
  refreshState.refreshSubscribers = [];
};

const performTokenRefresh = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const { data } = await axios.post('/api/auth/refresh', { refreshToken });
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data.accessToken;
};

const handleRefreshError = (error: unknown): never => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
  throw error;
};

const refreshToken = async (): Promise<string> => {
  // If already refreshing, return the existing promise
  if (refreshState.isRefreshing && refreshState.refreshPromise) {
    return refreshState.refreshPromise;
  }

  // Start new refresh
  refreshState.isRefreshing = true;
  refreshState.refreshPromise = performTokenRefresh()
    .finally(() => {
      refreshState.isRefreshing = false;
      refreshState.refreshPromise = null;
    });

  return refreshState.refreshPromise;
};

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 and token refresh
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (!orig) {
      return Promise.reject(error);
    }

    // Only handle 401 errors that haven't been retried
    if (error.response?.status !== 401 || orig._retry) {
      return Promise.reject(error);
    }

    orig._retry = true;

    try {
      // Get new token (will queue if already refreshing)
      const newToken = await refreshToken();
      
      // Notify other waiting requests
      notifySubscribers(newToken);
      
      // Retry original request with new token
      orig.headers.Authorization = `Bearer ${newToken}`;
      return api(orig);
    } catch (refreshError) {
      return handleRefreshError(refreshError);
    }
  }
);

// For testing - reset the refresh state
export const resetRefreshState = (): void => {
  refreshState.isRefreshing = false;
  refreshState.refreshPromise = null;
  refreshState.refreshSubscribers = [];
};

// For testing - get current refresh state
export const getRefreshState = (): RefreshState => ({
  isRefreshing: refreshState.isRefreshing,
  refreshPromise: refreshState.refreshPromise,
  refreshSubscribers: [...refreshState.refreshSubscribers],
});

export default api;
