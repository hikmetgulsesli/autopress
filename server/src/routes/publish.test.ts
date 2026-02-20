import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import publishRouter from './publish';
import * as wordpressService from '../services/wordpress.service';
import * as bloggerService from '../services/blogger.service';
import { query } from '../db/connection';

// Mock dependencies
vi.mock('../db/connection');
vi.mock('../services/wordpress.service');
vi.mock('../services/blogger.service');
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  },
  AuthRequest: class {},
}));

const app = express();
app.use(express.json());
app.use('/api/publish', publishRouter);

describe('GET /api/publish/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return queue data with new API format', async () => {
    const mockQueue = [
      {
        id: 1,
        site_id: 1,
        title: 'Test Article',
        slug: 'test-article',
        excerpt: 'Test excerpt',
        status: 'scheduled',
        scheduled_at: '2024-01-15T10:00:00Z',
        platform: 'wordpress',
        site_name: 'Test Site',
      },
    ];

    (query as any).mockResolvedValueOnce({ rows: mockQueue });

    const response = await request(app).get('/api/publish/queue');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockQueue);
  });

  it('should return empty array when no queue items', async () => {
    (query as any).mockResolvedValueOnce({ rows: [] });

    const response = await request(app).get('/api/publish/queue');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it('should handle database errors with proper error format', async () => {
    (query as any).mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app).get('/api/publish/queue');

    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('DATABASE_ERROR');
    expect(response.body.error.message).toBe('Yayın kuyruğu alınırken bir hata oluştu');
  });
});

describe('GET /api/publish/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return history data with new API format', async () => {
    const mockHistory = [
      {
        id: 1,
        article_id: 1,
        site_id: 1,
        platform: 'wordpress',
        platform_post_id: '123',
        status: 'success',
        published_at: '2024-01-15T10:00:00Z',
        article_title: 'Test Article',
        site_name: 'Test Site',
      },
    ];

    (query as any).mockResolvedValueOnce({ rows: mockHistory });

    const response = await request(app).get('/api/publish/history');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockHistory);
  });

  it('should return empty array when no history items', async () => {
    (query as any).mockResolvedValueOnce({ rows: [] });

    const response = await request(app).get('/api/publish/history');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it('should handle database errors with proper error format', async () => {
    (query as any).mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app).get('/api/publish/history');

    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('DATABASE_ERROR');
    expect(response.body.error.message).toBe('Yayın geçmişi alınırken bir hata oluştu');
  });
});

describe('GET /api/publish/schedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return schedules data', async () => {
    const mockSchedules = [
      {
        id: 1,
        site_id: 1,
        day_of_week: 1,
        publish_time: '10:00',
        site_name: 'Test Site',
      },
    ];

    (query as any).mockResolvedValueOnce({ rows: mockSchedules });

    const response = await request(app).get('/api/publish/schedules');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockSchedules);
  });

  it('should handle database errors with proper error format', async () => {
    (query as any).mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app).get('/api/publish/schedules');

    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('DATABASE_ERROR');
  });
});

describe('POST /api/publish/publish-now', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 when article not found', async () => {
    (query as any).mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 999,
        siteId: 1,
        platform: 'wordpress',
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toBe('Makale bulunamadı');
  });

  it('should return 404 when site not found', async () => {
    (query as any)
      .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test', content: 'Content', slug: 'test' }] }) // article found
      .mockResolvedValueOnce({ rows: [] }); // site not found

    const response = await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 999,
        platform: 'wordpress',
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('SITE_NOT_FOUND');
  });

  it('should return 400 when platform mismatch', async () => {
    (query as any)
      .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test', content: 'Content', slug: 'test' }] })
      .mockResolvedValueOnce({ rows: [{ platform: 'blogger', api_credentials: {} }] });

    const response = await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PLATFORM_MISMATCH');
  });

  it('should publish to WordPress successfully', async () => {
    const article = { 
      id: 1, 
      title: 'Test Article', 
      content: '<p>Test content</p>', 
      slug: 'test-article',
      excerpt: 'Test excerpt',
      tags: ['tag1', 'tag2'],
    };
    const siteCredentials = {
      platform: 'wordpress',
      api_credentials: {
        siteUrl: 'https://example.com',
        username: 'admin',
        applicationPassword: 'testpass123',
      },
    };
    const wpResult = {
      success: true,
      wordpressId: 123,
      wordpressUrl: 'https://example.com/test-article',
      status: 'publish',
    };

    (query as any)
      .mockResolvedValueOnce({ rows: [article] })
      .mockResolvedValueOnce({ rows: [siteCredentials] })
      .mockResolvedValueOnce({ rows: [] }) // update article
      .mockResolvedValueOnce({ rows: [] }); // insert history

    (wordpressService.publishPost as any).mockResolvedValueOnce(wpResult);

    const response = await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.platform).toBe('wordpress');
    expect(response.body.data.platformPostId).toBe('123');
    expect(response.body.data.publishedUrl).toBe('https://example.com/test-article');

    expect(wordpressService.publishPost).toHaveBeenCalledWith(1, {
      title: 'Test Article',
      content: '<p>Test content</p>',
      excerpt: 'Test excerpt',
      slug: 'test-article',
      status: 'publish',
    });
  });

  it('should publish to Blogger successfully', async () => {
    const article = { 
      id: 1, 
      title: 'Test Article', 
      content: '<p>Test content</p>', 
      slug: 'test-article',
      excerpt: 'Test excerpt',
      tags: ['tag1', 'tag2'],
    };
    const siteCredentials = {
      platform: 'blogger',
      api_credentials: {
        blogId: '123456789',
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        expiryDate: Date.now() + 3600 * 1000,
      },
    };
    const bloggerResult = {
      id: 'post-123',
      blogId: '123456789',
      title: 'Test Article',
      url: 'https://testblog.blogspot.com/2024/01/test-article.html',
      published: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    (query as any)
      .mockResolvedValueOnce({ rows: [article] })
      .mockResolvedValueOnce({ rows: [siteCredentials] })
      .mockResolvedValueOnce({ rows: [] }) // update article
      .mockResolvedValueOnce({ rows: [] }); // insert history

    (bloggerService.setCredentials as any).mockImplementation(() => {});
    (bloggerService.publishPost as any).mockResolvedValueOnce(bloggerResult);

    const response = await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'blogger',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.platform).toBe('blogger');
    expect(response.body.data.platformPostId).toBe('post-123');
    expect(response.body.data.publishedUrl).toBe('https://testblog.blogspot.com/2024/01/test-article.html');

    expect(bloggerService.setCredentials).toHaveBeenCalledWith({
      accessToken: 'test-token',
      refreshToken: 'refresh-token',
      expiryDate: expect.any(Number),
    });
    expect(bloggerService.publishPost).toHaveBeenCalledWith(
      {
        blogId: '123456789',
        title: 'Test Article',
        content: '<p>Test content</p>',
        labels: ['tag1', 'tag2'],
        isDraft: false,
      },
      1,
      1
    );
  });

  it('should handle WordPress missing credentials error', async () => {
    const article = { 
      id: 1, 
      title: 'Test Article', 
      content: '<p>Test content</p>', 
      slug: 'test-article',
    };
    const siteCredentials = {
      platform: 'wordpress',
      api_credentials: {}, // Missing credentials
    };

    (query as any)
      .mockResolvedValueOnce({ rows: [article] })
      .mockResolvedValueOnce({ rows: [siteCredentials] })
      .mockResolvedValueOnce({ rows: [] }); // insert failed history

    const response = await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('PUBLISH_ERROR');
    expect(response.body.error.message).toContain('API bilgileri eksik');
  });

  it('should handle Blogger missing blogId error', async () => {
    const article = { 
      id: 1, 
      title: 'Test Article', 
      content: '<p>Test content</p>', 
      slug: 'test-article',
    };
    const siteCredentials = {
      platform: 'blogger',
      api_credentials: {
        accessToken: 'test-token',
      },
    };

    (query as any)
      .mockResolvedValueOnce({ rows: [article] })
      .mockResolvedValueOnce({ rows: [siteCredentials] })
      .mockResolvedValueOnce({ rows: [] }); // insert failed history

    const response = await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'blogger',
      });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('PUBLISH_ERROR');
    expect(response.body.error.message).toContain('Blog ID eksik');
  });

  it('should handle WordPress API error', async () => {
    const article = { 
      id: 1, 
      title: 'Test Article', 
      content: '<p>Test content</p>', 
      slug: 'test-article',
    };
    const siteCredentials = {
      platform: 'wordpress',
      api_credentials: {
        siteUrl: 'https://example.com',
        username: 'admin',
        applicationPassword: 'testpass123',
      },
    };

    (query as any)
      .mockResolvedValueOnce({ rows: [article] })
      .mockResolvedValueOnce({ rows: [siteCredentials] })
      .mockResolvedValueOnce({ rows: [] }); // insert failed history

    (wordpressService.publishPost as any).mockRejectedValueOnce({
      code: 'AUTH_ERROR',
      message: 'Invalid WordPress credentials',
      statusCode: 401,
    });

    const response = await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_ERROR');
    expect(response.body.error.message).toBe('Invalid WordPress credentials');
  });

  it('should handle Blogger API error', async () => {
    const article = { 
      id: 1, 
      title: 'Test Article', 
      content: '<p>Test content</p>', 
      slug: 'test-article',
    };
    const siteCredentials = {
      platform: 'blogger',
      api_credentials: {
        blogId: '123456789',
        accessToken: 'test-token',
      },
    };

    (query as any)
      .mockResolvedValueOnce({ rows: [article] })
      .mockResolvedValueOnce({ rows: [siteCredentials] })
      .mockResolvedValueOnce({ rows: [] }); // insert failed history

    (bloggerService.setCredentials as any).mockImplementation(() => {});
    (bloggerService.publishPost as any).mockRejectedValueOnce({
      code: 'AUTH_ERROR',
      message: 'Authentication failed',
      statusCode: 401,
    });

    const response = await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'blogger',
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_ERROR');
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 'invalid',
        siteId: 1,
        platform: 'invalid-platform',
      });

    expect(response.status).toBe(400);
  });

  it('should save real published URL to article', async () => {
    const article = { 
      id: 1, 
      title: 'Test Article', 
      content: '<p>Test content</p>', 
      slug: 'test-article',
    };
    const siteCredentials = {
      platform: 'wordpress',
      api_credentials: {
        siteUrl: 'https://myblog.com',
        username: 'admin',
        applicationPassword: 'testpass123',
      },
    };
    const wpResult = {
      success: true,
      wordpressId: 456,
      wordpressUrl: 'https://myblog.com/2024/01/test-article',
      status: 'publish',
    };

    (query as any)
      .mockResolvedValueOnce({ rows: [article] })
      .mockResolvedValueOnce({ rows: [siteCredentials] })
      .mockResolvedValueOnce({ rows: [] }) // update article
      .mockResolvedValueOnce({ rows: [] }); // insert history

    (wordpressService.publishPost as any).mockResolvedValueOnce(wpResult);

    await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

    // Verify article was updated with real URL
    const updateCall = (query as any).mock.calls[2];
    expect(updateCall[0]).toContain('published_url = $3');
    expect(updateCall[1][2]).toBe('https://myblog.com/2024/01/test-article');
  });

  it('should log publish history with correct platform and post ID', async () => {
    const article = { 
      id: 1, 
      title: 'Test Article', 
      content: '<p>Test content</p>', 
      slug: 'test-article',
    };
    const siteCredentials = {
      platform: 'wordpress',
      api_credentials: {
        siteUrl: 'https://example.com',
        username: 'admin',
        applicationPassword: 'testpass123',
      },
    };
    const wpResult = {
      success: true,
      wordpressId: 789,
      wordpressUrl: 'https://example.com/test-article',
      status: 'publish',
    };

    (query as any)
      .mockResolvedValueOnce({ rows: [article] })
      .mockResolvedValueOnce({ rows: [siteCredentials] })
      .mockResolvedValueOnce({ rows: [] }) // update article
      .mockResolvedValueOnce({ rows: [] }); // insert history

    (wordpressService.publishPost as any).mockResolvedValueOnce(wpResult);

    await request(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

    // Verify history was logged with correct data
    const historyCall = (query as any).mock.calls[3];
    expect(historyCall[0]).toContain('INSERT INTO publish_history');
    expect(historyCall[0]).toContain("'success'"); // status is a literal in SQL
    expect(historyCall[1]).toContain(1); // articleId
    expect(historyCall[1]).toContain(1); // siteId
    expect(historyCall[1]).toContain('wordpress'); // platform
    expect(historyCall[1]).toContain('789'); // platform_post_id
  });
});
