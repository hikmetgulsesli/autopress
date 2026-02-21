import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  publishPost, 
  updatePost, 
  deletePost, 
  publishPage, 
  uploadMedia, 
  getCategories, 
  getTags,
  clearCredentialsCache 
} from './wordpress.service';
import { query } from '../db/connection';

// Mock the database connection
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

describe('WordPressService', () => {
  beforeEach(() => {
    delete process.env.WORDPRESS_SITE_URL;
    delete process.env.WORDPRESS_USERNAME;
    delete process.env.WORDPRESS_APP_PASSWORD;
    clearCredentialsCache();
    vi.clearAllMocks();
  });

  describe('Configuration Validation', () => {
    it('should reject when WordPress is not configured and no siteId provided', async () => {
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        updatePost(1, { title: 'Test' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        deletePost(1)
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        publishPage({ title: 'Test', content: 'Content', status: 'publish' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        uploadMedia('https://example.com/image.jpg')
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        getCategories()
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        getTags()
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });
    });

    it('should require site URL from env', async () => {
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
      
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });
    });

    it('should require username from env', async () => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
      
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });
    });

    it('should require application password from env', async () => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });
    });
  });

  describe('Site-Specific Credentials', () => {
    it('should use credentials from site record when siteId is provided', async () => {
      const mockSite = {
        domain: 'https://site1.com',
        api_credentials: {
          wordpress: {
            siteUrl: 'https://wordpress.site1.com',
            username: 'site1user',
            applicationPassword: 'site1pass',
          },
        },
      };

      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockSite],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // Should get API_ERROR (not MISSING_CONFIG) because credentials were found
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });

      expect(query).toHaveBeenCalledWith(
        'SELECT domain, api_credentials FROM sites WHERE id = $1 AND platform = $2',
        [1, 'wordpress']
      );
    });

    it('should fallback to env when site has no wordpress credentials', async () => {
      const mockSite = {
        domain: 'https://site1.com',
        api_credentials: {},
      };

      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockSite],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // No env vars set, should fail with MISSING_CONFIG
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });
    });

    it('should fallback to env when site not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // No env vars set, should fail with MISSING_CONFIG
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 999)
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });
    });

    it('should use site domain as fallback when wordpress.siteUrl is not set', async () => {
      const mockSite = {
        domain: 'https://site-from-domain.com',
        api_credentials: {
          wordpress: {
            username: 'siteuser',
            applicationPassword: 'sitepass',
          },
        },
      };

      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockSite],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // Should get API_ERROR (not MISSING_CONFIG) because credentials were found
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('should cache site credentials', async () => {
      const mockSite = {
        domain: 'https://site1.com',
        api_credentials: {
          wordpress: {
            siteUrl: 'https://wordpress.site1.com',
            username: 'site1user',
            applicationPassword: 'site1pass',
          },
        },
      };

      vi.mocked(query).mockResolvedValue({
        rows: [mockSite],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // First call should query DB
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });

      expect(query).toHaveBeenCalledTimes(1);

      // Second call should use cache (no additional DB query)
      await expect(
        publishPost(2, { title: 'Test 2', content: 'Content 2', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });

      // query should still only be called once
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should support different credentials for different sites', async () => {
      const mockSite1 = {
        domain: 'https://site1.com',
        api_credentials: {
          wordpress: {
            siteUrl: 'https://wordpress.site1.com',
            username: 'site1user',
            applicationPassword: 'site1pass',
          },
        },
      };

      const mockSite2 = {
        domain: 'https://site2.com',
        api_credentials: {
          wordpress: {
            siteUrl: 'https://wordpress.site2.com',
            username: 'site2user',
            applicationPassword: 'site2pass',
          },
        },
      };

      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [mockSite1],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [mockSite2],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      // First call for site 1
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });

      // Second call for site 2
      await expect(
        publishPost(2, { title: 'Test 2', content: 'Content 2', status: 'publish' }, 2)
      ).rejects.toMatchObject({ code: 'API_ERROR' });

      // Should query DB twice (once per site)
      expect(query).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully and fallback to env', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB connection failed'));

      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';

      // Should fallback to env and get API_ERROR
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });

  describe('Valid Configuration', () => {
    beforeEach(() => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
    });

    it('should accept publish with all post fields', async () => {
      // With config set, should get API error (not config error)
      await expect(
        publishPost(1, {
          title: 'Test Post',
          content: '<p>Test content</p>',
          excerpt: 'Test excerpt',
          slug: 'test-post',
          status: 'publish',
          categories: [1, 2],
          tags: [3, 4],
        })
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('should accept draft status', async () => {
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'draft' })
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('should accept future status', async () => {
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'future' })
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('should accept private status', async () => {
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'private' })
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });

  describe('updatePost with siteId', () => {
    beforeEach(() => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
    });

    it('should accept siteId parameter', async () => {
      await expect(
        updatePost(123, { title: 'Updated' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });

  describe('deletePost with siteId', () => {
    beforeEach(() => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
    });

    it('should accept siteId parameter', async () => {
      await expect(
        deletePost(123, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });

  describe('publishPage with siteId', () => {
    beforeEach(() => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
    });

    it('should accept siteId parameter', async () => {
      await expect(
        publishPage({ title: 'Test Page', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });

  describe('uploadMedia with siteId', () => {
    beforeEach(() => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
    });

    it('should accept siteId parameter', async () => {
      await expect(
        uploadMedia('https://example.com/image.jpg', 'Image Title', 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });

  describe('getCategories with siteId', () => {
    beforeEach(() => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
    });

    it('should accept siteId parameter', async () => {
      await expect(
        getCategories(1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });

  describe('getTags with siteId', () => {
    beforeEach(() => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
    });

    it('should accept siteId parameter', async () => {
      await expect(
        getTags(1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });
});
