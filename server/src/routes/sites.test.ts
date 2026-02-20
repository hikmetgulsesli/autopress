import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import sitesRouter from './sites';

// Mock the database
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

// Mock the auth middleware
vi.mock('../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  AuthRequest: class AuthRequest {},
}));

// Mock WordPress service
vi.mock('../services/wordpress.service', () => ({
  testConnection: vi.fn(),
}));

// Mock Blogger service
vi.mock('../services/blogger.service', () => ({
  testConnection: vi.fn(),
}));

import { query } from '../db/connection';
import { testConnection as testWordPressConnection } from '../services/wordpress.service';
import { testConnection as testBloggerConnection } from '../services/blogger.service';

const mockedQuery = vi.mocked(query);
const mockedTestWordPressConnection = vi.mocked(testWordPressConnection);
const mockedTestBloggerConnection = vi.mocked(testBloggerConnection);

describe('Sites Routes - Test Connection', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/sites', sitesRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/sites/:id/test-connection', () => {
    it('should return 404 if site not found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .post('/api/sites/999/test-connection')
        .expect(404);

      expect(response.body.error).toBe('Site bulunamadı');
    });

    it('should test WordPress connection successfully', async () => {
      const mockSite = {
        id: 1,
        name: 'Test WP Site',
        platform: 'wordpress',
        domain: 'https://example.com',
        api_credentials: {
          siteUrl: 'https://example.com',
          username: 'admin',
          applicationPassword: 'pass123',
        },
      };

      mockedQuery.mockResolvedValueOnce({ rows: [mockSite] } as any);
      mockedTestWordPressConnection.mockResolvedValueOnce({
        success: true,
        message: 'WordPress connection successful',
      });

      const response = await request(app)
        .post('/api/sites/1/test-connection')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'WordPress connection successful',
      });
      expect(mockedTestWordPressConnection).toHaveBeenCalledWith({
        siteUrl: 'https://example.com',
        username: 'admin',
        applicationPassword: 'pass123',
      });
    });

    it('should test WordPress connection with failure', async () => {
      const mockSite = {
        id: 1,
        name: 'Test WP Site',
        platform: 'wordpress',
        domain: 'https://example.com',
        api_credentials: {
          siteUrl: 'https://example.com',
          username: 'admin',
          applicationPassword: 'wrongpass',
        },
      };

      mockedQuery.mockResolvedValueOnce({ rows: [mockSite] } as any);
      mockedTestWordPressConnection.mockResolvedValueOnce({
        success: false,
        message: 'Invalid WordPress credentials',
      });

      const response = await request(app)
        .post('/api/sites/1/test-connection')
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid WordPress credentials',
      });
    });

    it('should test Blogger connection successfully', async () => {
      const mockSite = {
        id: 2,
        name: 'Test Blogger Site',
        platform: 'blogger',
        domain: 'https://test.blogspot.com',
        api_credentials: {
          accessToken: 'valid-token',
          refreshToken: 'refresh-token',
          expiryDate: Date.now() + 3600000,
        },
      };

      mockedQuery.mockResolvedValueOnce({ rows: [mockSite] } as any);
      mockedTestBloggerConnection.mockResolvedValueOnce({
        success: true,
        message: 'Blogger connection successful',
      });

      const response = await request(app)
        .post('/api/sites/2/test-connection')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Blogger connection successful',
      });
      expect(mockedTestBloggerConnection).toHaveBeenCalledWith({
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiryDate: expect.any(Number),
      });
    });

    it('should test Blogger connection with failure', async () => {
      const mockSite = {
        id: 2,
        name: 'Test Blogger Site',
        platform: 'blogger',
        domain: 'https://test.blogspot.com',
        api_credentials: {
          accessToken: 'expired-token',
          refreshToken: 'refresh-token',
          expiryDate: Date.now() - 3600000,
        },
      };

      mockedQuery.mockResolvedValueOnce({ rows: [mockSite] } as any);
      mockedTestBloggerConnection.mockResolvedValueOnce({
        success: false,
        message: 'Invalid or expired Blogger OAuth tokens',
      });

      const response = await request(app)
        .post('/api/sites/2/test-connection')
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid or expired Blogger OAuth tokens',
      });
    });

    it('should return 400 for unsupported platform', async () => {
      const mockSite = {
        id: 3,
        name: 'Test Unknown Site',
        platform: 'unknown',
        domain: 'https://unknown.com',
        api_credentials: {},
      };

      mockedQuery.mockResolvedValueOnce({ rows: [mockSite] } as any);

      const response = await request(app)
        .post('/api/sites/3/test-connection')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unsupported platform');
    });

    it('should use domain as siteUrl fallback for WordPress', async () => {
      const mockSite = {
        id: 1,
        name: 'Test WP Site',
        platform: 'wordpress',
        domain: 'https://example.com',
        api_credentials: {
          username: 'admin',
          applicationPassword: 'pass123',
        },
      };

      mockedQuery.mockResolvedValueOnce({ rows: [mockSite] } as any);
      mockedTestWordPressConnection.mockResolvedValueOnce({
        success: true,
        message: 'WordPress connection successful',
      });

      await request(app)
        .post('/api/sites/1/test-connection')
        .expect(200);

      expect(mockedTestWordPressConnection).toHaveBeenCalledWith({
        siteUrl: 'https://example.com',
        username: 'admin',
        applicationPassword: 'pass123',
      });
    });

    it('should handle missing api_credentials gracefully', async () => {
      const mockSite = {
        id: 1,
        name: 'Test WP Site',
        platform: 'wordpress',
        domain: 'https://example.com',
        api_credentials: null,
      };

      mockedQuery.mockResolvedValueOnce({ rows: [mockSite] } as any);
      mockedTestWordPressConnection.mockResolvedValueOnce({
        success: false,
        message: 'WordPress username and application password are required',
      });

      const response = await request(app)
        .post('/api/sites/1/test-connection')
        .expect(200);

      expect(response.body.success).toBe(false);
    });

    it('should handle database errors', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/sites/1/test-connection')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
    });
  });
});
