import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as schedulerService from '../services/scheduler.service';
import { query } from '../db/connection';

// Mock the database connection
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

// Mock the logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock wordpress service
vi.mock('../services/wordpress.service', () => ({
  publishPost: vi.fn(),
  WordPressPost: {},
}));

// Mock blogger service
vi.mock('../services/blogger.service', () => ({
  publishPost: vi.fn(),
  setCredentials: vi.fn(),
}));

// Mock search console service
vi.mock('../services/searchconsole.service', () => ({
  autoSubmitAfterPublish: vi.fn(),
}));

describe('SchedulerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Jitter Generation', () => {
    it('should generate jitter within ±15 minutes by default', () => {
      for (let i = 0; i < 100; i++) {
        const jitter = schedulerService.generateJitter();
        expect(jitter).toBeGreaterThanOrEqual(-15);
        expect(jitter).toBeLessThanOrEqual(15);
      }
    });

    it('should generate jitter within custom range', () => {
      const maxJitter = 30;
      for (let i = 0; i < 100; i++) {
        const jitter = schedulerService.generateJitter(maxJitter);
        expect(jitter).toBeGreaterThanOrEqual(-maxJitter);
        expect(jitter).toBeLessThanOrEqual(maxJitter);
      }
    });

    it('should generate zero jitter when maxJitter is 0', () => {
      const jitter = schedulerService.generateJitter(0);
      expect(jitter).toBe(0);
    });
  });

  describe('Apply Jitter', () => {
    it('should add positive jitter to scheduled time', () => {
      const scheduledTime = new Date('2024-01-01T12:00:00Z');
      const jitteredTime = schedulerService.applyJitter(scheduledTime, 10);
      expect(jitteredTime.getTime()).toBe(new Date('2024-01-01T12:10:00Z').getTime());
    });

    it('should subtract negative jitter from scheduled time', () => {
      const scheduledTime = new Date('2024-01-01T12:00:00Z');
      const jitteredTime = schedulerService.applyJitter(scheduledTime, -10);
      expect(jitteredTime.getTime()).toBe(new Date('2024-01-01T11:50:00Z').getTime());
    });

    it('should not modify original date', () => {
      const scheduledTime = new Date('2024-01-01T12:00:00Z');
      const originalTime = scheduledTime.getTime();
      schedulerService.applyJitter(scheduledTime, 10);
      expect(scheduledTime.getTime()).toBe(originalTime);
    });
  });

  describe('Get Due Articles', () => {
    it('should return due articles from database', async () => {
      const mockArticles = [
        { id: 1, article_id: 101, status: 'pending', scheduled_at: new Date() },
        { id: 2, article_id: 102, status: 'pending', scheduled_at: new Date() },
      ];

      (query as any).mockResolvedValueOnce({ rows: mockArticles });

      const result = await schedulerService.getDueArticles();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM publish_queue"),
        []
      );
      expect(result).toHaveLength(2);
      expect(result[0].article_id).toBe(101);
    });

    it('should return empty array when no due articles', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const result = await schedulerService.getDueArticles();

      expect(result).toHaveLength(0);
    });

    it('should throw error on database failure', async () => {
      (query as any).mockRejectedValueOnce(new Error('DB connection failed'));

      await expect(schedulerService.getDueArticles()).rejects.toMatchObject({
        code: 'DB_ERROR',
      });
    });
  });

  describe('Update Queue Status', () => {
    it('should update status to publishing', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      await schedulerService.updateQueueStatus(1, 'publishing');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE publish_queue"),
        expect.arrayContaining(['publishing'])
      );
    });

    it('should update status to published with platform details', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      await schedulerService.updateQueueStatus(1, 'published', undefined, 'post-123', 'https://example.com/post');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("platform_post_id"),
        expect.arrayContaining(['published', 'post-123', 'https://example.com/post'])
      );
    });

    it('should update status to failed with error message', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      await schedulerService.updateQueueStatus(1, 'failed', 'Connection timeout');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("error_message"),
        expect.arrayContaining(['failed', 'Connection timeout'])
      );
    });
  });

  describe('Schedule Article', () => {
    it('should schedule article with jitter', async () => {
      const mockQueueItem = {
        id: 1,
        article_id: 101,
        site_id: 1,
        scheduled_at: new Date(),
        status: 'pending',
      };

      (query as any)
        .mockResolvedValueOnce({ rows: [mockQueueItem] })  // INSERT
        .mockResolvedValueOnce({ rows: [] });               // UPDATE articles

      const result = await schedulerService.scheduleArticle(
        101,
        1,
        new Date('2024-01-01T12:00:00Z'),
        'Europe/Istanbul',
        true,
        15
      );

      expect(query).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should schedule article without jitter', async () => {
      const mockQueueItem = {
        id: 1,
        article_id: 101,
        site_id: 1,
        scheduled_at: new Date('2024-01-01T12:00:00Z'),
        status: 'pending',
      };

      (query as any)
        .mockResolvedValueOnce({ rows: [mockQueueItem] })
        .mockResolvedValueOnce({ rows: [] });

      const scheduledTime = new Date('2024-01-01T12:00:00Z');
      await schedulerService.scheduleArticle(101, 1, scheduledTime, 'UTC', false);

      // Check that jitter_minutes is 0 when jitter is disabled
      const insertCall = (query as any).mock.calls[0];
      expect(insertCall[1][4]).toBe(0); // jitter_minutes parameter
    });

    it('should throw error on schedule failure', async () => {
      (query as any).mockRejectedValueOnce(new Error('DB error'));

      await expect(
        schedulerService.scheduleArticle(101, 1, new Date())
      ).rejects.toMatchObject({
        code: 'SCHEDULE_ERROR',
      });
    });
  });

  describe('Cancel Scheduled Article', () => {
    it('should cancel pending scheduled article', async () => {
      (query as any)
        .mockResolvedValueOnce({ rows: [{ article_id: 101 }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await schedulerService.cancelScheduledArticle(1);

      expect(result).toBe(true);
      expect(query).toHaveBeenCalledTimes(2);
    });

    it('should return false when no pending article found', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const result = await schedulerService.cancelScheduledArticle(1);

      expect(result).toBe(false);
    });
  });

  describe('Get Queue Stats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        pending: 5,
        publishing: 1,
        published: 10,
        failed: 2,
        cancelled: 1,
        total: 19,
      };

      (query as any).mockResolvedValueOnce({ rows: [mockStats] });

      const result = await schedulerService.getQueueStats();

      expect(result).toEqual(mockStats);
    });

    it('should throw error on database failure', async () => {
      (query as any).mockRejectedValueOnce(new Error('DB error'));

      await expect(schedulerService.getQueueStats()).rejects.toMatchObject({
        code: 'DB_ERROR',
      });
    });
  });

  describe('Get Scheduled Articles', () => {
    it('should return scheduled articles with pagination', async () => {
      const mockItems = [
        { id: 1, article_id: 101, status: 'pending' },
        { id: 2, article_id: 102, status: 'pending' },
      ];

      (query as any)
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: mockItems });

      const result = await schedulerService.getScheduledArticles('pending', 10, 0);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it('should filter by status when provided', async () => {
      (query as any)
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await schedulerService.getScheduledArticles('published');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = $1"),
        expect.arrayContaining(['published'])
      );
    });

    it('should not filter by status when not provided', async () => {
      (query as any)
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: [] });

      await schedulerService.getScheduledArticles();

      // First call is COUNT query, second is SELECT query
      // Both should not have WHERE status clause
      const countCall = (query as any).mock.calls[0];
      const selectCall = (query as any).mock.calls[1];

      expect(countCall[0]).not.toContain("WHERE status");
      expect(selectCall[0]).not.toContain("WHERE status");
    });
  });

  describe('Retry Failed Publish', () => {
    it('should retry failed publish when attempts < max_attempts', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await schedulerService.retryFailedPublish(1);

      expect(result).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE publish_queue"),
        expect.arrayContaining([1])
      );
    });

    it('should return false when no eligible failed publish found', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const result = await schedulerService.retryFailedPublish(1);

      expect(result).toBe(false);
    });
  });

  describe('Scheduler Status', () => {
    it('should return initial status as not running', () => {
      const status = schedulerService.getSchedulerStatus();

      expect(status.running).toBe(false);
      expect(status.isProcessing).toBe(false);
      expect(status.config.cronExpression).toBe('*/5 * * * *');
    });
  });

  describe('Process Queue', () => {
    it('should process due articles and return stats', async () => {
      const mockArticles = [
        { id: 1, article_id: 101, site_id: 1, status: 'pending', attempts: 0, max_attempts: 3 },
      ];

      const mockArticle = {
        id: 101,
        title: 'Test Article',
        content: 'Test content',
        excerpt: null,
        slug: 'test-article',
        meta_title: null,
        meta_description: null,
        featured_image_url: null,
        site_id: 1,
      };

      const mockSite = {
        platform: 'wordpress',
        platform_id: null,
      };

      (query as any)
        .mockResolvedValueOnce({ rows: mockArticles })  // getDueArticles
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (publishing)
        .mockResolvedValueOnce({ rows: [mockSite] })    // getSitePlatform
        .mockResolvedValueOnce({ rows: [mockArticle] }) // getArticleForPublish
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (published)
        .mockResolvedValueOnce({ rows: [] })            // updateArticleStatus
        .mockResolvedValueOnce({ rows: [] });           // logPublishHistory

      const { publishPost } = await import('../services/wordpress.service');
      (publishPost as any).mockResolvedValueOnce({
        success: true,
        wordpressId: 123,
        wordpressUrl: 'https://example.com/post',
        status: 'publish',
      });

      const stats = await schedulerService.processQueue();

      expect(stats.processed).toBe(1);
      expect(stats.published).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('should handle publish failures and retry', async () => {
      const mockArticles = [
        { id: 1, article_id: 101, site_id: 1, status: 'pending', attempts: 0, max_attempts: 3 },
      ];

      const mockArticle = {
        id: 101,
        title: 'Test Article',
        content: 'Test content',
        excerpt: null,
        slug: 'test-article',
        meta_title: null,
        meta_description: null,
        featured_image_url: null,
        site_id: 1,
      };

      const mockSite = {
        platform: 'wordpress',
        platform_id: null,
      };

      (query as any)
        .mockResolvedValueOnce({ rows: mockArticles })
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (publishing)
        .mockResolvedValueOnce({ rows: [mockSite] })    // getSitePlatform
        .mockResolvedValueOnce({ rows: [mockArticle] }) // getArticleForPublish
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (pending - retry)
        .mockResolvedValueOnce({ rows: [] });           // logPublishHistory

      const { publishPost } = await import('../services/wordpress.service');
      (publishPost as any).mockRejectedValueOnce(new Error('API Error'));

      const stats = await schedulerService.processQueue();

      expect(stats.processed).toBe(1);
      expect(stats.published).toBe(0);
      expect(stats.failed).toBe(1);
    });

    it('should return empty stats when no due articles', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const stats = await schedulerService.processQueue();

      expect(stats.processed).toBe(0);
      expect(stats.published).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('Blogger Scheduler Integration', () => {
    it('should publish article to Blogger when site platform is blogger', async () => {
      const mockArticles = [
        { id: 1, article_id: 101, site_id: 2, status: 'pending', attempts: 0, max_attempts: 3 },
      ];

      const mockArticle = {
        id: 101,
        title: 'Test Blogger Article',
        content: 'Test content for blogger',
        excerpt: null,
        slug: 'test-blogger-article',
        meta_title: null,
        meta_description: null,
        featured_image_url: null,
        site_id: 2,
      };

      const mockSite = {
        platform: 'blogger',
        platform_id: '123456789',
        api_credentials: {
          blogger: {
            oauth_token: 'test-access-token',
            oauth_refresh_token: 'test-refresh-token',
            oauth_expires_at: '2025-12-31T23:59:59Z',
          },
        },
      };

      (query as any)
        .mockResolvedValueOnce({ rows: mockArticles })  // getDueArticles
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (publishing)
        .mockResolvedValueOnce({ rows: [mockArticle] }) // getArticleForPublish
        .mockResolvedValueOnce({ rows: [mockSite] })    // getSitePlatform
        .mockResolvedValueOnce({ rows: [mockSite] })    // get site credentials
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (published)
        .mockResolvedValueOnce({ rows: [] })            // updateArticleStatus
        .mockResolvedValueOnce({ rows: [] });           // logPublishHistory

      const { publishPost: bloggerPublishPost, setCredentials } = await import('../services/blogger.service');
      (bloggerPublishPost as any).mockResolvedValueOnce({
        id: 'post-123',
        blogId: '123456789',
        title: 'Test Blogger Article',
        url: 'https://testblog.blogspot.com/2024/01/test-article.html',
        published: '2024-01-01T12:00:00Z',
      });

      const stats = await schedulerService.processQueue();

      expect(stats.processed).toBe(1);
      expect(stats.published).toBe(1);
      expect(stats.failed).toBe(0);
      expect(setCredentials).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiryDate: expect.any(Number),
      });
      expect(bloggerPublishPost).toHaveBeenCalledWith(
        expect.objectContaining({
          blogId: '123456789',
          title: 'Test Blogger Article',
          content: 'Test content for blogger',
          isDraft: false,
        }),
        101,
        2
      );
    });

    it('should handle Blogger publish failure and retry', async () => {
      const mockArticles = [
        { id: 1, article_id: 101, site_id: 2, status: 'pending', attempts: 0, max_attempts: 3 },
      ];

      const mockArticle = {
        id: 101,
        title: 'Test Blogger Article',
        content: 'Test content',
        excerpt: null,
        slug: 'test-blogger-article',
        meta_title: null,
        meta_description: null,
        featured_image_url: null,
        site_id: 2,
      };

      const mockSite = {
        platform: 'blogger',
        platform_id: '123456789',
        api_credentials: {
          blogger: {
            oauth_token: 'test-access-token',
            oauth_refresh_token: 'test-refresh-token',
            oauth_expires_at: '2025-12-31T23:59:59Z',
          },
        },
      };

      (query as any)
        .mockResolvedValueOnce({ rows: mockArticles })
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (publishing)
        .mockResolvedValueOnce({ rows: [mockArticle] }) // getArticleForPublish
        .mockResolvedValueOnce({ rows: [mockSite] })    // getSitePlatform
        .mockResolvedValueOnce({ rows: [mockSite] })    // get site credentials
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (pending - retry)
        .mockResolvedValueOnce({ rows: [] });           // logPublishHistory

      const { publishPost: bloggerPublishPost, setCredentials } = await import('../services/blogger.service');
      (bloggerPublishPost as any).mockRejectedValueOnce(new Error('Blogger API Error'));

      const stats = await schedulerService.processQueue();

      expect(stats.processed).toBe(1);
      expect(stats.published).toBe(0);
      expect(stats.failed).toBe(1);
      expect(setCredentials).toHaveBeenCalled();
    });

    it('should fail when Blogger blog ID is not configured', async () => {
      const mockArticles = [
        { id: 1, article_id: 101, site_id: 2, status: 'pending', attempts: 0, max_attempts: 3 },
      ];

      const mockArticle = {
        id: 101,
        title: 'Test Blogger Article',
        content: 'Test content',
        excerpt: null,
        slug: 'test-blogger-article',
        meta_title: null,
        meta_description: null,
        featured_image_url: null,
        site_id: 2,
      };

      const mockSite = {
        platform: 'blogger',
        platform_id: null, // No blog ID configured
      };

      (query as any)
        .mockResolvedValueOnce({ rows: mockArticles })
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (publishing)
        .mockResolvedValueOnce({ rows: [mockArticle] }) // getArticleForPublish
        .mockResolvedValueOnce({ rows: [mockSite] })    // getSitePlatform
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (pending - retry)
        .mockResolvedValueOnce({ rows: [] });           // logPublishHistory

      const stats = await schedulerService.processQueue();

      expect(stats.processed).toBe(1);
      expect(stats.published).toBe(0);
      expect(stats.failed).toBe(1);
    });

    it('should log platform type accurately in publish history for Blogger', async () => {
      const mockArticles = [
        { id: 1, article_id: 101, site_id: 2, status: 'pending', attempts: 0, max_attempts: 3 },
      ];

      const mockArticle = {
        id: 101,
        title: 'Test Blogger Article',
        content: 'Test content',
        excerpt: null,
        slug: 'test-blogger-article',
        meta_title: null,
        meta_description: null,
        featured_image_url: null,
        site_id: 2,
      };

      const mockSite = {
        platform: 'blogger',
        platform_id: '123456789',
        api_credentials: {
          blogger: {
            oauth_token: 'test-access-token',
            oauth_refresh_token: 'test-refresh-token',
            oauth_expires_at: '2025-12-31T23:59:59Z',
          },
        },
      };

      (query as any)
        .mockResolvedValueOnce({ rows: mockArticles })  // getDueArticles
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (publishing)
        .mockResolvedValueOnce({ rows: [mockArticle] }) // getArticleForPublish
        .mockResolvedValueOnce({ rows: [mockSite] })    // getSitePlatform
        .mockResolvedValueOnce({ rows: [mockSite] })    // get site credentials
        .mockResolvedValueOnce({ rows: [] })            // updateQueueStatus (published)
        .mockResolvedValueOnce({ rows: [] })            // updateArticleStatus
        .mockResolvedValueOnce({ rows: [] });           // logPublishHistory

      const { publishPost: bloggerPublishPost } = await import('../services/blogger.service');
      (bloggerPublishPost as any).mockResolvedValueOnce({
        id: 'post-123',
        blogId: '123456789',
        title: 'Test Blogger Article',
        url: 'https://testblog.blogspot.com/2024/01/test-article.html',
      });

      await schedulerService.processQueue();

      // Check that logPublishHistory was called with platform='blogger'
      const logCall = (query as any).mock.calls.find((call: any[]) => 
        call[0].includes('INSERT INTO publish_history')
      );
      expect(logCall).toBeDefined();
      expect(logCall[1]).toContain('blogger');
    });
  });
});
