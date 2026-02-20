import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the database
const mockQuery = vi.fn();
vi.mock('../db/connection', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

// Mock WordPress service
const mockTestWordPressConnection = vi.fn();
vi.mock('../services/wordpress.service', () => ({
  testConnection: (...args: any[]) => mockTestWordPressConnection(...args),
}));

// Mock Blogger service
const mockTestBloggerConnection = vi.fn();
vi.mock('../services/blogger.service', () => ({
  testConnection: (...args: any[]) => mockTestBloggerConnection(...args),
  BloggerTokens: {},
}));

// Mock auth middleware
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  },
  AuthRequest: {},
}));

import sitesRouter from './sites';

const app = express();
app.use(express.json());
app.use('/api/sites', sitesRouter);

describe('POST /api/sites/:id/test-connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WordPress sites', () => {
    it('should return success when WordPress credentials are valid', async () => {
      const siteId = '1';
      const site = {
        id: 1,
        platform: 'wordpress',
        api_credentials: {
          siteUrl: 'https://example.com',
          username: 'admin',
          applicationPassword: 'pass123',
        },
      };

      mockQuery.mockResolvedValue({ rows: [site] });
      mockTestWordPressConnection.mockResolvedValue({
        success: true,
        message: 'WordPress connection successful',
      });

      const response = await request(app)
        .post(`/api/sites/${siteId}/test-connection`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'WordPress connection successful',
      });
      expect(mockTestWordPressConnection).toHaveBeenCalledWith({
        siteUrl: 'https://example.com',
        username: 'admin',
        applicationPassword: 'pass123',
      });
    });

    it('should return failure when WordPress credentials are invalid', async () => {
      const siteId = '1';
      const site = {
        id: 1,
        platform: 'wordpress',
        api_credentials: {
          siteUrl: 'https://example.com',
          username: 'admin',
          applicationPassword: 'wrongpass',
        },
      };

      mockQuery.mockResolvedValue({ rows: [site] });
      mockTestWordPressConnection.mockResolvedValue({
        success: false,
        message: 'Invalid WordPress credentials',
      });

      const response = await request(app)
        .post(`/api/sites/${siteId}/test-connection`)
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid WordPress credentials',
      });
    });

    it('should return 400 when WordPress credentials are missing', async () => {
      const siteId = '1';
      const site = {
        id: 1,
        platform: 'wordpress',
        api_credentials: {},
      };

      mockQuery.mockResolvedValue({ rows: [site] });

      const response = await request(app)
        .post(`/api/sites/${siteId}/test-connection`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Missing WordPress credentials. Required: siteUrl, username, applicationPassword',
      });
      expect(mockTestWordPressConnection).not.toHaveBeenCalled();
    });
  });

  describe('Blogger sites', () => {
    it('should return success when Blogger tokens are valid', async () => {
      const siteId = '2';
      const site = {
        id: 2,
        platform: 'blogger',
        api_credentials: {
          accessToken: 'valid-token',
          refreshToken: 'refresh-token',
          expiryDate: Date.now() + 3600 * 1000,
        },
      };

      mockQuery.mockResolvedValue({ rows: [site] });
      mockTestBloggerConnection.mockResolvedValue({
        success: true,
        message: 'Blogger connection successful',
      });

      const response = await request(app)
        .post(`/api/sites/${siteId}/test-connection`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Blogger connection successful',
      });
      expect(mockTestBloggerConnection).toHaveBeenCalledWith({
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiryDate: expect.any(Number),
      });
    });

    it('should return failure when Blogger tokens are invalid', async () => {
      const siteId = '2';
      const site = {
        id: 2,
        platform: 'blogger',
        api_credentials: {
          accessToken: 'invalid-token',
          refreshToken: 'refresh-token',
          expiryDate: Date.now() + 3600 * 1000,
        },
      };

      mockQuery.mockResolvedValue({ rows: [site] });
      mockTestBloggerConnection.mockResolvedValue({
        success: false,
        message: 'Invalid Blogger OAuth tokens. Please re-authenticate.',
      });

      const response = await request(app)
        .post(`/api/sites/${siteId}/test-connection`)
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid Blogger OAuth tokens. Please re-authenticate.',
      });
    });

    it('should return 400 when Blogger access token is missing', async () => {
      const siteId = '2';
      const site = {
        id: 2,
        platform: 'blogger',
        api_credentials: {},
      };

      mockQuery.mockResolvedValue({ rows: [site] });

      const response = await request(app)
        .post(`/api/sites/${siteId}/test-connection`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Missing Blogger access token',
      });
      expect(mockTestBloggerConnection).not.toHaveBeenCalled();
    });
  });

  describe('Error cases', () => {
    it('should return 404 when site does not exist', async () => {
      const siteId = '999';
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post(`/api/sites/${siteId}/test-connection`)
        .expect(404);

      expect(response.body).toEqual({ success: false, message: 'Site bulunamadı' });
    });

    it('should return 400 for unsupported platforms', async () => {
      const siteId = '3';
      const site = {
        id: 3,
        platform: 'unknown',
        api_credentials: {},
      };

      mockQuery.mockResolvedValue({ rows: [site] });

      const response = await request(app)
        .post(`/api/sites/${siteId}/test-connection`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Unsupported platform: unknown',
      });
    });

    it('should handle database errors', async () => {
      const siteId = '1';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post(`/api/sites/${siteId}/test-connection`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Database connection failed',
      });
    });
  });
});
