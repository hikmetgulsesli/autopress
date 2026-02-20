import { describe, it, expect, beforeEach } from 'vitest';
import {
  listBlogs,
  publishPost,
  publishPage,
  getAuthUrl,
  exchangeCode,
} from '../services/blogger.service';

describe('BloggerService', () => {
  const validCredentials = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3519/auth/callback',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiryDate: Date.now() + 3600 * 1000,
  };

  describe('Input Validation', () => {
    it('should reject missing client ID', () => {
      expect(() =>
        getAuthUrl({
          clientId: '',
          clientSecret: 'test-secret',
          redirectUri: 'http://localhost/callback',
        })
      ).toThrow(expect.objectContaining({
        code: 'MISSING_CLIENT_ID',
        message: 'Google OAuth client ID is required',
      }));
    });

    it('should reject missing client secret', () => {
      expect(() =>
        getAuthUrl({
          clientId: 'test-client-id',
          clientSecret: '',
          redirectUri: 'http://localhost/callback',
        })
      ).toThrow(expect.objectContaining({
        code: 'MISSING_CLIENT_SECRET',
        message: 'Google OAuth client secret is required',
      }));
    });

    it('should reject missing redirect URI', () => {
      expect(() =>
        getAuthUrl({
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          redirectUri: '',
        })
      ).toThrow(expect.objectContaining({
        code: 'MISSING_REDIRECT_URI',
        message: 'Google OAuth redirect URI is required',
      }));
    });

    it('should reject publishPost with missing blog ID', async () => {
      await expect(
        publishPost(validCredentials, {
          blogId: '',
          title: 'Test Title',
          content: 'Test content',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_BLOG_ID',
        message: 'Blog ID is required',
      });
    });

    it('should reject publishPost with missing title', async () => {
      await expect(
        publishPost(validCredentials, {
          blogId: '123',
          title: '',
          content: 'Test content',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_TITLE',
        message: 'Post title is required',
      });
    });

    it('should reject publishPost with whitespace-only title', async () => {
      await expect(
        publishPost(validCredentials, {
          blogId: '123',
          title: '   ',
          content: 'Test content',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_TITLE',
        message: 'Post title is required',
      });
    });

    it('should reject publishPost with missing content', async () => {
      await expect(
        publishPost(validCredentials, {
          blogId: '123',
          title: 'Test Title',
          content: '',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_CONTENT',
        message: 'Post content is required',
      });
    });

    it('should reject publishPost with whitespace-only content', async () => {
      await expect(
        publishPost(validCredentials, {
          blogId: '123',
          title: 'Test Title',
          content: '   ',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_CONTENT',
        message: 'Post content is required',
      });
    });

    it('should reject publishPage with missing blog ID', async () => {
      await expect(
        publishPage(validCredentials, {
          blogId: '',
          title: 'Test Title',
          content: 'Test content',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_BLOG_ID',
        message: 'Blog ID is required',
      });
    });

    it('should reject publishPage with missing title', async () => {
      await expect(
        publishPage(validCredentials, {
          blogId: '123',
          title: '',
          content: 'Test content',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_TITLE',
        message: 'Page title is required',
      });
    });

    it('should reject publishPage with missing content', async () => {
      await expect(
        publishPage(validCredentials, {
          blogId: '123',
          title: 'Test Title',
          content: '',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_CONTENT',
        message: 'Page content is required',
      });
    });
  });

  describe('Valid Input Parameters', () => {
    it('should accept valid credentials for getAuthUrl', () => {
      expect(() =>
        getAuthUrl({
          clientId: 'valid-client-id',
          clientSecret: 'valid-client-secret',
          redirectUri: 'http://localhost/callback',
        })
      ).not.toThrow();
    });

    it('should generate auth URL with correct format', () => {
      const authUrl = getAuthUrl({
        clientId: 'valid-client-id',
        clientSecret: 'valid-client-secret',
        redirectUri: 'http://localhost/callback',
      });

      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('client_id=valid-client-id');
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%2Fcallback');
    });

    it('should accept valid publishPost options', async () => {
      // This will fail with auth error since we're using mock credentials,
      // but it should pass validation
      await expect(
        publishPost(validCredentials, {
          blogId: '123',
          title: 'Valid Title',
          content: 'Valid content',
          labels: ['tag1', 'tag2'],
          isDraft: true,
        })
      ).rejects.not.toMatchObject({
        code: 'MISSING_BLOG_ID',
      });
    });

    it('should accept valid publishPage options', async () => {
      await expect(
        publishPage(validCredentials, {
          blogId: '123',
          title: 'Valid Title',
          content: 'Valid content',
          isDraft: true,
        })
      ).rejects.not.toMatchObject({
        code: 'MISSING_BLOG_ID',
      });
    });
  });

  describe('OAuth Token Management', () => {
    it('should handle invalid credentials for listBlogs', async () => {
      await expect(
        listBlogs({
          clientId: 'invalid',
          clientSecret: 'invalid',
          redirectUri: 'http://localhost/callback',
          accessToken: 'invalid-token',
        })
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
      });
    });

    it('should handle invalid credentials for publishPost', async () => {
      await expect(
        publishPost(
          {
            clientId: 'invalid',
            clientSecret: 'invalid',
            redirectUri: 'http://localhost/callback',
            accessToken: 'invalid-token',
          },
          {
            blogId: '123',
            title: 'Test Title',
            content: 'Test content',
          }
        )
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
      });
    });

    it('should handle invalid credentials for publishPage', async () => {
      await expect(
        publishPage(
          {
            clientId: 'invalid',
            clientSecret: 'invalid',
            redirectUri: 'http://localhost/callback',
            accessToken: 'invalid-token',
          },
          {
            blogId: '123',
            title: 'Test Title',
            content: 'Test content',
          }
        )
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
      });
    });
  });

  describe('Error Handling', () => {
    it('should return AUTH_ERROR for invalid access token in listBlogs', async () => {
      await expect(
        listBlogs({
          clientId: 'test',
          clientSecret: 'test',
          redirectUri: 'http://localhost/callback',
          accessToken: 'invalid',
        })
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        message: expect.stringContaining('Invalid or expired'),
      });
    });

    it('should return AUTH_ERROR for invalid access token in publishPost', async () => {
      await expect(
        publishPost(
          {
            clientId: 'test',
            clientSecret: 'test',
            redirectUri: 'http://localhost/callback',
            accessToken: 'invalid',
          },
          {
            blogId: '123',
            title: 'Test',
            content: 'Test content',
          }
        )
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
      });
    });

    it('should return AUTH_ERROR for invalid access token in publishPage', async () => {
      await expect(
        publishPage(
          {
            clientId: 'test',
            clientSecret: 'test',
            redirectUri: 'http://localhost/callback',
            accessToken: 'invalid',
          },
          {
            blogId: '123',
            title: 'Test',
            content: 'Test content',
          }
        )
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
      });
    });
  });

  describe('Token Exchange', () => {
    it('should reject invalid authorization code', async () => {
      await expect(
        exchangeCode(
          {
            clientId: 'test',
            clientSecret: 'test',
            redirectUri: 'http://localhost/callback',
          },
          'invalid-code'
        )
      ).rejects.toMatchObject({
        code: 'AUTH_EXCHANGE_ERROR',
      });
    });
  });
});
