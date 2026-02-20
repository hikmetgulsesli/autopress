import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  publishPost, 
  updatePost, 
  deletePost, 
  publishPage, 
  uploadMedia, 
  getCategories, 
  getTags 
} from './wordpress.service';
import { query } from '../db/connection';

// Mock the database connection
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

const mockedQuery = vi.mocked(query);

describe('WordPressService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WORDPRESS_SITE_URL;
    delete process.env.WORDPRESS_USERNAME;
    delete process.env.WORDPRESS_APP_PASSWORD;
  });

  describe('Configuration Validation', () => {
    it('should reject when WordPress is not configured (no env, no site)', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ api_credentials: {} }] } as any);

      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
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
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          api_credentials: {
            wordpress: {
              siteUrl: 'https://site1.example.com',
              username: 'site1user',
              applicationPassword: 'site1pass',
            }
          }
        }]
      } as any);

      // Should get API error (not config error) when site credentials are valid
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });

      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT api_credentials FROM sites WHERE id = $1',
        [1]
      );
    });

    it('should fallback to env when site has no wordpress credentials', async () => {
      process.env.WORDPRESS_SITE_URL = 'https://env.example.com';
      process.env.WORDPRESS_USERNAME = 'envuser';
      process.env.WORDPRESS_APP_PASSWORD = 'envpass';

      mockedQuery.mockResolvedValueOnce({
        rows: [{ api_credentials: {} }]
      } as any);

      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('should fallback to env when site has no api_credentials', async () => {
      process.env.WORDPRESS_SITE_URL = 'https://env.example.com';
      process.env.WORDPRESS_USERNAME = 'envuser';
      process.env.WORDPRESS_APP_PASSWORD = 'envpass';

      mockedQuery.mockResolvedValueOnce({
        rows: [{ api_credentials: null }]
      } as any);

      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('should fallback to env when site is not found', async () => {
      process.env.WORDPRESS_SITE_URL = 'https://env.example.com';
      process.env.WORDPRESS_USERNAME = 'envuser';
      process.env.WORDPRESS_APP_PASSWORD = 'envpass';

      mockedQuery.mockResolvedValueOnce({
        rows: []
      } as any);

      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 999)
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('should support multiple sites with different credentials', async () => {
      // Site 1 credentials
      mockedQuery
        .mockResolvedValueOnce({
          rows: [{
            api_credentials: {
              wordpress: {
                siteUrl: 'https://site1.example.com',
                username: 'site1user',
                applicationPassword: 'site1pass',
              }
            }
          }]
        } as any)
        // Site 2 credentials
        .mockResolvedValueOnce({
          rows: [{
            api_credentials: {
              wordpress: {
                siteUrl: 'https://site2.example.com',
                username: 'site2user',
                applicationPassword: 'site2pass',
              }
            }
          }]
        } as any);

      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 1)
      ).rejects.toMatchObject({ code: 'API_ERROR' });

      await expect(
        publishPost(2, { title: 'Test 2', content: 'Content 2', status: 'publish' }, 2)
      ).rejects.toMatchObject({ code: 'API_ERROR' });

      expect(mockedQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT api_credentials FROM sites WHERE id = $1',
        [1]
      );
      expect(mockedQuery).toHaveBeenNthCalledWith(
        2,
        'SELECT api_credentials FROM sites WHERE id = $1',
        [2]
      );
    });

    it('should pass siteId to all service functions', async () => {
      mockedQuery.mockResolvedValue({
        rows: [{
          api_credentials: {
            wordpress: {
              siteUrl: 'https://example.com',
              username: 'user',
              applicationPassword: 'pass',
            }
          }
        }]
      } as any);

      await expect(updatePost(1, { title: 'Test' }, 1)).rejects.toMatchObject({ code: 'API_ERROR' });
      
      // Reset mock for next call
      mockedQuery.mockClear();
      mockedQuery.mockResolvedValue({
        rows: [{
          api_credentials: {
            wordpress: {
              siteUrl: 'https://example.com',
              username: 'user',
              applicationPassword: 'pass',
            }
          }
        }]
      } as any);
      await expect(deletePost(1, 1)).rejects.toMatchObject({ code: 'API_ERROR' });
      
      mockedQuery.mockClear();
      mockedQuery.mockResolvedValue({
        rows: [{
          api_credentials: {
            wordpress: {
              siteUrl: 'https://example.com',
              username: 'user',
              applicationPassword: 'pass',
            }
          }
        }]
      } as any);
      await expect(publishPage({ title: 'Test', content: 'Content', status: 'publish' }, 1)).rejects.toMatchObject({ code: 'API_ERROR' });
      
      mockedQuery.mockClear();
      mockedQuery.mockResolvedValue({
        rows: [{
          api_credentials: {
            wordpress: {
              siteUrl: 'https://example.com',
              username: 'user',
              applicationPassword: 'pass',
            }
          }
        }]
      } as any);
      await expect(uploadMedia('https://example.com/image.jpg', 'title', 1)).rejects.toMatchObject({ code: 'API_ERROR' });
      
      mockedQuery.mockClear();
      mockedQuery.mockResolvedValue({
        rows: [{
          api_credentials: {
            wordpress: {
              siteUrl: 'https://example.com',
              username: 'user',
              applicationPassword: 'pass',
            }
          }
        }]
      } as any);
      await expect(getCategories(1)).rejects.toMatchObject({ code: 'API_ERROR' });
      
      mockedQuery.mockClear();
      mockedQuery.mockResolvedValue({
        rows: [{
          api_credentials: {
            wordpress: {
              siteUrl: 'https://example.com',
              username: 'user',
              applicationPassword: 'pass',
            }
          }
        }]
      } as any);
      await expect(getTags(1)).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });

  describe('Valid Configuration', () => {
    beforeEach(() => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
    });

    it('should accept publish with all post fields', async () => {
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

  describe('publishPost with siteId', () => {
    it('should attempt to log publish history with siteId', async () => {
      mockedQuery
        .mockResolvedValueOnce({
          rows: [{
            api_credentials: {
              wordpress: {
                siteUrl: 'https://example.com',
                username: 'user',
                applicationPassword: 'pass',
              }
            }
          }]
        } as any);

      try {
        await publishPost(1, { title: 'Test', content: 'Content', status: 'publish' }, 5);
      } catch (e) {
        // Expected to fail on API call
      }

      // First query should be to get site credentials
      expect(mockedQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT api_credentials FROM sites WHERE id = $1',
        [5]
      );
    });
  });
});
