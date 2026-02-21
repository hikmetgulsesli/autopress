import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import { query } from '../db/connection';
import { logger } from '../utils/logger';
import publishRoutes from '../routes/publish';
import { QueryResult } from 'pg';

interface ArticleData {
  id: number;
  title: string;
  content: string;
  excerpt: string | null;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  site_id: number;
}

interface SiteData {
  id: number;
  name: string;
  domain?: string;
  platform: string;
  api_credentials: {
    siteUrl?: string;
    username?: string;
    applicationPassword?: string;
    blogId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number;
  } | null;
}

// Mock dependencies
vi.mock('../db/connection');
vi.mock('../utils/logger');

// Mock services
const mockWordpressPublishPost = vi.fn();
const mockBloggerPublishPost = vi.fn();

vi.mock('../services/wordpress.service', () => ({
  publishPost: mockWordpressPublishPost,
}));

vi.mock('../services/blogger.service', () => ({
  publishPost: mockBloggerPublishPost,
}));

// Setup test app
const app = express();
app.use(express.json());
app.use('/api/publish', publishRoutes);

describe('Publish Now Integration - WordPress (US-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls wordpress.service.publishPost for WordPress platform', async () => {
    const articleData = {
      id: 1,
      title: 'Test Article',
      content: '<p>Test content</p>',
      excerpt: 'Test excerpt',
      slug: 'test-article',
      meta_title: 'Test Meta Title',
      meta_description: 'Test meta description',
      featured_image_url: 'https://example.com/image.jpg',
      site_id: 1,
    };

    const siteData = {
      id: 1,
      name: 'Test Site',
      domain: 'example.com',
      platform: 'wordpress',
      api_credentials: {
        siteUrl: 'https://example.com',
        username: 'testuser',
        applicationPassword: 'test-password',
      },
    };

    // Mock article query
    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    // Mock site query
    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    // Mock WordPress publish success
    mockWordpressPublishPost.mockResolvedValueOnce({
      success: true,
      wordpressId: 123,
      wordpressUrl: 'https://example.com/test-article',
      status: 'publish',
    });

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      })
      .expect(200);

    expect(mockWordpressPublishPost).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Article',
        content: '<p>Test content</p>',
        status: 'publish',
      })
    );

    expect(response.body.success).toBe(true);
    expect(response.body.data.publishedUrl).toBe('https://example.com/test-article');
  });

  it('WordPress success response contains real post URL', async () => {
    const articleData = {
      id: 1,
      title: 'Test Article',
      content: '<p>Test content</p>',
      excerpt: null,
      slug: 'test-article',
      meta_title: null,
      meta_description: null,
      featured_image_url: null,
      site_id: 1,
    };

    const siteData = {
      id: 1,
      name: 'Test Site',
      domain: 'example.com',
      platform: 'wordpress',
      api_credentials: {
        siteUrl: 'https://example.com',
        username: 'admin',
        applicationPassword: 'app-pass-123',
      },
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    mockWordpressPublishPost.mockResolvedValueOnce({
      success: true,
      wordpressId: 123,
      wordpressUrl: 'https://example.com/real-post-url',
      status: 'publish',
    });

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      })
      .expect(200);

    expect(response.body.data.publishedUrl).toBe('https://example.com/real-post-url');
    expect(response.body.data.platformPostId).toBe('123');
  });

  it('returns 400 error for missing WordPress credentials', async () => {
    const articleData = {
      id: 1,
      title: 'Test Article',
      content: '<p>Test content</p>',
      excerpt: null,
      slug: 'test-article',
      site_id: 1,
    };

    const siteData = {
      id: 1,
      name: 'Test Site',
      platform: 'wordpress',
      api_credentials: null,
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      })
      .expect(400);

    expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
    expect(response.body.error.message).toContain('WordPress credentials');
  });

  it('returns 401 error for invalid WordPress credentials', async () => {
    const articleData = {
      id: 1,
      title: 'Test Article',
      content: '<p>Test content</p>',
      site_id: 1,
    };

    const siteData = {
      id: 1,
      name: 'Test Site',
      platform: 'wordpress',
      api_credentials: {
        siteUrl: 'https://example.com',
        username: 'testuser',
        applicationPassword: 'wrong-password',
      },
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    // Mock WordPress auth error
    mockWordpressPublishPost.mockRejectedValueOnce({
      code: 'AUTH_ERROR',
      message: 'Invalid credentials',
    });

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      })
      .expect(401);

    expect(response.body.error.code).toBe('AUTH_ERROR');
    expect(response.body.error.message).toContain('Invalid credentials');
  });

  it('returns 404 error for article not found', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [],
    } as any);

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 999,
        siteId: 1,
        platform: 'wordpress',
      })
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 error for missing required fields', async () => {
    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({})
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('required');
  });
});

describe('Publish Now Integration - Blogger (US-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls blogger.service.publishPost for Blogger platform', async () => {
    const articleData = {
      id: 2,
      title: 'Blogger Article',
      content: '<p>Blogger content</p>',
      excerpt: 'Blogger excerpt',
      slug: 'blogger-article',
      meta_title: 'Blogger Meta Title',
      meta_description: 'Blogger meta description',
      featured_image_url: 'https://example.com/blogger-image.jpg',
      site_id: 2,
    };

    const siteData = {
      id: 2,
      name: 'Blogger Site',
      domain: 'blogname.blogspot.com',
      platform: 'blogger',
      api_credentials: {
        blogId: '123456789',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiryDate: 1234567890,
      },
    };

    // Mock article query
    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    // Mock site query
    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    // Mock Blogger publish success
    mockBloggerPublishPost.mockResolvedValueOnce({
      id: 'blogger-post-123',
      blogId: '123456789',
      title: 'Blogger Article',
      url: 'https://blogname.blogspot.com/2024/01/blogger-article.html',
      published: new Date().toISOString(),
    });

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 2,
        siteId: 2,
        platform: 'blogger',
      })
      .expect(200);

    expect(mockBloggerPublishPost).toHaveBeenCalledWith(
      expect.objectContaining({
        blogId: '123456789',
        title: 'Blogger Article',
        content: '<p>Blogger content</p>',
        labels: [],
        isDraft: false,
      }),
      2,
      2
    );

    expect(response.body.success).toBe(true);
    expect(response.body.data.publishedUrl).toBe('https://blogname.blogspot.com/2024/01/blogger-article.html');
  });

  it('Blogger success response contains real post URL', async () => {
    const articleData = {
      id: 2,
      title: 'Blogger Article',
      content: '<p>Blogger content</p>',
      site_id: 2,
    };

    const siteData = {
      id: 2,
      platform: 'blogger',
      api_credentials: {
        blogId: '123456789',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiryDate: 1234567890,
      },
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    mockBloggerPublishPost.mockResolvedValueOnce({
      id: 'post-xyz',
      blogId: '123456789',
      title: 'Blogger Article',
      url: 'https://myblog.blogspot.com/2024/02/my-post.html',
    });

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 2,
        siteId: 2,
        platform: 'blogger',
      })
      .expect(200);

    expect(response.body.data.publishedUrl).toBe('https://myblog.blogspot.com/2024/02/my-post.html');
    expect(response.body.data.platformPostId).toBe('post-xyz');
  });

  it('returns 400 error for missing Blogger credentials', async () => {
    const articleData = {
      id: 2,
      title: 'Blogger Article',
      content: '<p>Content</p>',
      site_id: 2,
    };

    const siteData = {
      id: 2,
      platform: 'blogger',
      api_credentials: null,
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 2,
        siteId: 2,
        platform: 'blogger',
      })
      .expect(400);

    expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
    expect(response.body.error.message).toContain('Blogger credentials');
  });

  it('returns 401 error for invalid Blogger tokens', async () => {
    const articleData = {
      id: 2,
      title: 'Blogger Article',
      content: '<p>Content</p>',
      site_id: 2,
    };

    const siteData = {
      id: 2,
      platform: 'blogger',
      api_credentials: {
        blogId: '123456789',
        accessToken: 'invalid-token',
        refreshToken: 'invalid-refresh',
        expiryDate: 1234567890,
      },
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    // Mock Blogger auth error
    mockBloggerPublishPost.mockRejectedValueOnce({
      code: 'AUTH_ERROR',
      message: 'Authentication failed',
    });

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 2,
        siteId: 2,
        platform: 'blogger',
      })
      .expect(401);

    expect(response.body.error.code).toBe('AUTH_ERROR');
    expect(response.body.error.message).toContain('Authentication failed');
  });

  it('returns 403 error for Blogger forbidden access', async () => {
    const articleData = {
      id: 2,
      title: 'Blogger Article',
      content: '<p>Content</p>',
      site_id: 2,
    };

    const siteData = {
      id: 2,
      platform: 'blogger',
      api_credentials: {
        blogId: '123456789',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiryDate: 1234567890,
      },
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    // Mock Blogger forbidden error
    mockBloggerPublishPost.mockRejectedValueOnce({
      code: 'FORBIDDEN',
      message: 'Not authorized to publish to this blog',
    });

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 2,
        siteId: 2,
        platform: 'blogger',
      })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 error for Blogger blog not found', async () => {
    const articleData = {
      id: 2,
      title: 'Blogger Article',
      content: '<p>Content</p>',
      site_id: 2,
    };

    const siteData = {
      id: 2,
      platform: 'blogger',
      api_credentials: {
        blogId: 'invalid-blog-id',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiryDate: 1234567890,
      },
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    // Mock Blogger blog not found error
    mockBloggerPublishPost.mockRejectedValueOnce({
      code: 'BLOG_NOT_FOUND',
      message: 'Blog not found',
    });

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 2,
        siteId: 2,
        platform: 'blogger',
      })
      .expect(404);

    expect(response.body.error.code).toBe('BLOG_NOT_FOUND');
  });
});

describe('Publish Now - Error Handling (US-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('logs API errors properly', async () => {
    const articleData = {
      id: 1,
      title: 'Test Article',
      content: '<p>Content</p>',
      site_id: 1,
    };

    const siteData = {
      id: 1,
      platform: 'wordpress',
      api_credentials: {
        siteUrl: 'https://example.com',
        username: 'admin',
        applicationPassword: 'pass',
      },
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    // Mock WordPress API error
    mockWordpressPublishPost.mockRejectedValueOnce({
      code: 'API_ERROR',
      message: 'WordPress API error',
    });

    await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      })
      .expect(500);

    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.stringContaining('Error publishing article'),
      expect.any(Object)
    );
  });

  it('returns 500 for unexpected errors', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('Database error'));

    await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      })
      .expect(500);

    expect(vi.mocked(logger.error)).toHaveBeenCalled();
  });

  it('handles invalid platform gracefully', async () => {
    const articleData = {
      id: 1,
      title: 'Test Article',
      content: '<p>Content</p>',
      site_id: 1,
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [{
        id: 1,
        platform: 'unknown',
        api_credentials: null,
      }],
    } as any);

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 1,
        siteId: 1,
        platform: 'unknown',
      })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_PLATFORM');
    expect(response.body.error.message).toContain('Invalid platform');
  });

  it('successfully publishes WordPress article with real data flow', async () => {
    const articleData = {
      id: 100,
      title: 'WordPress Integration Test',
      content: '<p>Full WordPress integration test content</p>',
      excerpt: 'Test excerpt for WordPress',
      slug: 'wordpress-integration-test',
      meta_title: 'WordPress Integration Test Meta',
      meta_description: 'Testing WordPress publish integration',
      featured_image_url: 'https://cdn.example.com/wp-image.jpg',
      site_id: 10,
    };

    const siteData = {
      id: 10,
      name: 'WordPress Test Site',
      domain: 'wptest.com',
      platform: 'wordpress',
      api_credentials: {
        siteUrl: 'https://wptest.com',
        username: 'wpuser',
        applicationPassword: 'wp-app-pass',
      },
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    mockWordpressPublishPost.mockResolvedValueOnce({
      success: true,
      wordpressId: 456,
      wordpressUrl: 'https://wptest.com/wordpress-integration-test',
      status: 'publish',
    });

    // Mock update queries
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any);
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any);

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 100,
        siteId: 10,
        platform: 'wordpress',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('successfully published');
    expect(response.body.data.publishedUrl).toBe('https://wptest.com/wordpress-integration-test');
    expect(response.body.data.platformPostId).toBe('456');
  });

  it('successfully publishes Blogger article with real data flow', async () => {
    const articleData = {
      id: 200,
      title: 'Blogger Integration Test',
      content: '<p>Full Blogger integration test content</p>',
      excerpt: 'Test excerpt for Blogger',
      slug: 'blogger-integration-test',
      meta_title: 'Blogger Integration Test Meta',
      meta_description: 'Testing Blogger publish integration',
      featured_image_url: 'https://cdn.example.com/blog-image.jpg',
      site_id: 20,
    };

    const siteData = {
      id: 20,
      name: 'Blogger Test Site',
      domain: 'blogtest.blogspot.com',
      platform: 'blogger',
      api_credentials: {
        blogId: '987654321',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiryDate: 1234567890,
      },
    };

    vi.mocked(query).mockResolvedValueOnce({
      rows: [articleData],
    } as any);

    vi.mocked(query).mockResolvedValueOnce({
      rows: [siteData],
    } as any);

    mockBloggerPublishPost.mockResolvedValueOnce({
      id: 'blogger-post-abc',
      blogId: '987654321',
      title: 'Blogger Integration Test',
      url: 'https://blogtest.blogspot.com/2024/02/blogger-integration-test.html',
    });

    // Mock update queries
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any);
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any);

    const response = await supertest(app)
      .post('/api/publish/publish-now')
      .send({
        articleId: 200,
        siteId: 20,
        platform: 'blogger',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('successfully published');
    expect(response.body.data.publishedUrl).toBe('https://blogtest.blogspot.com/2024/02/blogger-integration-test.html');
    expect(response.body.data.platformPostId).toBe('blogger-post-abc');
  });
});
