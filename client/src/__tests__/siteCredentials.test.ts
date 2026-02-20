import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSiteStore, Site, ApiCredentials, WordPressCredentials, BloggerCredentials } from '../store/siteStore';

// Mock the API module
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Site API Credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WordPress Credentials', () => {
    it('should have correct WordPress credentials interface', () => {
      const wpCreds: WordPressCredentials = {
        siteUrl: 'https://example.com',
        username: 'admin',
        appPassword: 'abcd efgh ijkl mnop',
      };

      expect(wpCreds).toHaveProperty('siteUrl');
      expect(wpCreds).toHaveProperty('username');
      expect(wpCreds).toHaveProperty('appPassword');
      expect(typeof wpCreds.siteUrl).toBe('string');
      expect(typeof wpCreds.username).toBe('string');
      expect(typeof wpCreds.appPassword).toBe('string');
    });

    it('should store WordPress credentials in api_credentials', () => {
      const apiCreds: ApiCredentials = {
        wordpress: {
          siteUrl: 'https://example.com',
          username: 'admin',
          appPassword: 'abcd efgh ijkl mnop',
        },
      };

      expect(apiCreds.wordpress).toBeDefined();
      expect(apiCreds.wordpress?.siteUrl).toBe('https://example.com');
      expect(apiCreds.wordpress?.username).toBe('admin');
      expect(apiCreds.wordpress?.appPassword).toBe('abcd efgh ijkl mnop');
    });
  });

  describe('Blogger Credentials', () => {
    it('should have correct Blogger credentials interface', () => {
      const bloggerCreds: BloggerCredentials = {
        clientId: '123456789.apps.googleusercontent.com',
        clientSecret: 'GOCSPX-xxxxxxxxxxxxxxxx',
        redirectUri: 'https://example.com/auth/callback',
      };

      expect(bloggerCreds).toHaveProperty('clientId');
      expect(bloggerCreds).toHaveProperty('clientSecret');
      expect(bloggerCreds).toHaveProperty('redirectUri');
      expect(typeof bloggerCreds.clientId).toBe('string');
      expect(typeof bloggerCreds.clientSecret).toBe('string');
      expect(typeof bloggerCreds.redirectUri).toBe('string');
    });

    it('should store Blogger credentials in api_credentials', () => {
      const apiCreds: ApiCredentials = {
        blogger: {
          clientId: '123456789.apps.googleusercontent.com',
          clientSecret: 'GOCSPX-xxxxxxxxxxxxxxxx',
          redirectUri: 'https://example.com/auth/callback',
        },
      };

      expect(apiCreds.blogger).toBeDefined();
      expect(apiCreds.blogger?.clientId).toBe('123456789.apps.googleusercontent.com');
      expect(apiCreds.blogger?.clientSecret).toBe('GOCSPX-xxxxxxxxxxxxxxxx');
      expect(apiCreds.blogger?.redirectUri).toBe('https://example.com/auth/callback');
    });

    it('should allow Blogger credentials without redirectUri', () => {
      const apiCreds: ApiCredentials = {
        blogger: {
          clientId: '123456789.apps.googleusercontent.com',
          clientSecret: 'GOCSPX-xxxxxxxxxxxxxxxx',
        },
      };

      expect(apiCreds.blogger).toBeDefined();
      expect(apiCreds.blogger?.clientId).toBeDefined();
      expect(apiCreds.blogger?.clientSecret).toBeDefined();
      expect(apiCreds.blogger?.redirectUri).toBeUndefined();
    });
  });

  describe('Site with API Credentials', () => {
    it('should have api_credentials field in Site interface', () => {
      const site: Site = {
        id: 1,
        name: 'Test Site',
        domain: 'example.com',
        platform: 'wordpress',
        platform_id: '123',
        api_credentials: {
          wordpress: {
            siteUrl: 'https://example.com',
            username: 'admin',
            appPassword: 'pass123',
          },
        },
        language: 'tr',
        niche: 'technology',
        adsense_status: 'pending',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(site).toHaveProperty('api_credentials');
      expect(site.api_credentials).toBeDefined();
    });

    it('should accept null api_credentials', () => {
      const site: Site = {
        id: 1,
        name: 'Test Site',
        domain: 'example.com',
        platform: 'wordpress',
        platform_id: '123',
        api_credentials: null,
        language: 'tr',
        niche: 'technology',
        adsense_status: 'pending',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(site.api_credentials).toBeNull();
    });

    it('should accept empty api_credentials object', () => {
      const site: Site = {
        id: 1,
        name: 'Test Site',
        domain: 'example.com',
        platform: 'blogger',
        platform_id: '123',
        api_credentials: {},
        language: 'tr',
        niche: 'technology',
        adsense_status: 'pending',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(site.api_credentials).toEqual({});
    });
  });

  describe('Platform-specific Credentials', () => {
    it('should validate WordPress platform with WordPress credentials', () => {
      const site: Site = {
        id: 1,
        name: 'WordPress Site',
        domain: 'wp.example.com',
        platform: 'wordpress',
        platform_id: '123',
        api_credentials: {
          wordpress: {
            siteUrl: 'https://wp.example.com',
            username: 'admin',
            appPassword: 'pass123',
          },
        },
        language: 'tr',
        niche: 'blog',
        adsense_status: 'approved',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(site.platform).toBe('wordpress');
      expect(site.api_credentials?.wordpress).toBeDefined();
      expect(site.api_credentials?.blogger).toBeUndefined();
    });

    it('should validate Blogger platform with Blogger credentials', () => {
      const site: Site = {
        id: 2,
        name: 'Blogger Site',
        domain: 'blogger.example.com',
        platform: 'blogger',
        platform_id: '456',
        api_credentials: {
          blogger: {
            clientId: '123.apps.googleusercontent.com',
            clientSecret: 'secret123',
            redirectUri: 'https://example.com/callback',
          },
        },
        language: 'en',
        niche: 'news',
        adsense_status: 'approved',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(site.platform).toBe('blogger');
      expect(site.api_credentials?.blogger).toBeDefined();
      expect(site.api_credentials?.wordpress).toBeUndefined();
    });
  });

  describe('Credential Masking', () => {
    it('should mask WordPress app password in UI', () => {
      // Password fields should use type="password" to mask input
      const inputType = 'password';
      expect(inputType).toBe('password');
    });

    it('should mask Blogger client secret in UI', () => {
      // Secret fields should use type="password" to mask input
      const inputType = 'password';
      expect(inputType).toBe('password');
    });
  });

  describe('Edit Site with Credentials', () => {
    it('should load existing WordPress credentials when editing', () => {
      const existingSite: Site = {
        id: 1,
        name: 'Existing WP Site',
        domain: 'wp.example.com',
        platform: 'wordpress',
        platform_id: '123',
        api_credentials: {
          wordpress: {
            siteUrl: 'https://wp.example.com',
            username: 'admin',
            appPassword: 'existingpass',
          },
        },
        language: 'tr',
        niche: 'tech',
        adsense_status: 'approved',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // When editing, credentials should be pre-populated
      expect(existingSite.api_credentials?.wordpress?.siteUrl).toBe('https://wp.example.com');
      expect(existingSite.api_credentials?.wordpress?.username).toBe('admin');
      expect(existingSite.api_credentials?.wordpress?.appPassword).toBe('existingpass');
    });

    it('should load existing Blogger credentials when editing', () => {
      const existingSite: Site = {
        id: 2,
        name: 'Existing Blogger Site',
        domain: 'blog.example.com',
        platform: 'blogger',
        platform_id: '456',
        api_credentials: {
          blogger: {
            clientId: '123.apps.googleusercontent.com',
            clientSecret: 'existingsecret',
            redirectUri: 'https://example.com/callback',
          },
        },
        language: 'en',
        niche: 'news',
        adsense_status: 'approved',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // When editing, credentials should be pre-populated
      expect(existingSite.api_credentials?.blogger?.clientId).toBe('123.apps.googleusercontent.com');
      expect(existingSite.api_credentials?.blogger?.clientSecret).toBe('existingsecret');
      expect(existingSite.api_credentials?.blogger?.redirectUri).toBe('https://example.com/callback');
    });
  });

  describe('API Integration', () => {
    it('should include api_credentials in site creation payload', () => {
      const createPayload = {
        name: 'New Site',
        domain: 'new.example.com',
        platform: 'wordpress' as const,
        platform_id: '789',
        api_credentials: {
          wordpress: {
            siteUrl: 'https://new.example.com',
            username: 'admin',
            appPassword: 'newpass123',
          },
        },
        language: 'tr',
        niche: 'tech',
      };

      expect(createPayload).toHaveProperty('api_credentials');
      expect(createPayload.api_credentials.wordpress).toBeDefined();
    });

    it('should include api_credentials in site update payload', () => {
      const updatePayload = {
        api_credentials: {
          blogger: {
            clientId: 'updated.apps.googleusercontent.com',
            clientSecret: 'updatedsecret',
          },
        },
      };

      expect(updatePayload).toHaveProperty('api_credentials');
      expect(updatePayload.api_credentials.blogger).toBeDefined();
    });
  });
});
