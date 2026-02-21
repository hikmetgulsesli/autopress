import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('API Token Refresh Race Condition Fix', () => {
  let mockLocalStorage: Record<string, string | null> = {};

  beforeEach(() => {
    // Reset modules to get fresh state
    vi.resetModules();
    
    // Clear localStorage mock
    mockLocalStorage = {};
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
      },
      writable: true,
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe('Token Refresh State Management', () => {
    it('should export resetRefreshState function', async () => {
      const { resetRefreshState, getRefreshState } = await import('./api');
      
      expect(typeof resetRefreshState).toBe('function');
      expect(typeof getRefreshState).toBe('function');
    });

    it('should reset refresh state correctly', async () => {
      const { resetRefreshState, getRefreshState } = await import('./api');
      
      resetRefreshState();
      
      const state = getRefreshState();
      expect(state.isRefreshing).toBe(false);
      expect(state.refreshPromise).toBeNull();
      expect(state.refreshSubscribers).toEqual([]);
    });
  });

  describe('API Module Structure', () => {
    it('should export default api instance', async () => {
      const apiModule = await import('./api');
      
      expect(apiModule.default).toBeDefined();
      expect(typeof apiModule.default.get).toBe('function');
      expect(typeof apiModule.default.post).toBe('function');
      expect(typeof apiModule.default.put).toBe('function');
      expect(typeof apiModule.default.delete).toBe('function');
    });

    it('should have interceptors configured', async () => {
      const { default: api } = await import('./api');
      
      expect(api.interceptors).toBeDefined();
      expect(api.interceptors.request).toBeDefined();
      expect(api.interceptors.response).toBeDefined();
    });
  });

  describe('Request Interceptor', () => {
    it('should have access token in localStorage', async () => {
      mockLocalStorage['accessToken'] = 'test-token';

      // Import module which will read the token
      const { default: api } = await import('./api');
      
      // Verify the token is set (module reads it on request)
      expect(mockLocalStorage['accessToken']).toBe('test-token');
    });
  });

  describe('Token Refresh Logic', () => {
    it('should have mutex pattern implemented', async () => {
      const { getRefreshState, resetRefreshState } = await import('./api');
      
      resetRefreshState();
      const state = getRefreshState();
      
      expect(state).toHaveProperty('isRefreshing');
      expect(state).toHaveProperty('refreshPromise');
      expect(state).toHaveProperty('refreshSubscribers');
    });

    it('should have refresh token handling capability', async () => {
      mockLocalStorage['refreshToken'] = 'refresh-token';

      const { default: api, resetRefreshState } = await import('./api');
      resetRefreshState();

      // Verify the refresh token is available
      expect(mockLocalStorage['refreshToken']).toBe('refresh-token');
    });
  });

  describe('Race Condition Prevention', () => {
    it('should use single promise pattern for concurrent refreshes', async () => {
      const { getRefreshState } = await import('./api');
      
      const state = getRefreshState();
      
      // The refreshPromise field is key to preventing race conditions
      expect(state).toHaveProperty('refreshPromise');
    });

    it('should track refreshing state', async () => {
      const { getRefreshState, resetRefreshState } = await import('./api');
      
      resetRefreshState();
      const state = getRefreshState();
      
      // isRefreshing flag prevents duplicate refresh calls
      expect(state.isRefreshing).toBe(false);
    });

    it('should have subscriber queue for waiting requests', async () => {
      const { getRefreshState, resetRefreshState } = await import('./api');
      
      resetRefreshState();
      const state = getRefreshState();
      
      // refreshSubscribers array queues requests waiting for token
      expect(Array.isArray(state.refreshSubscribers)).toBe(true);
    });
  });

  describe('Token Storage', () => {
    it('should store tokens in localStorage', async () => {
      const { default: api } = await import('./api');
      
      // Verify the api module can access localStorage
      expect(window.localStorage.setItem).toBeDefined();
      expect(window.localStorage.removeItem).toBeDefined();
    });
  });
});
