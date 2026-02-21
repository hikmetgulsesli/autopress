import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as schedulerService from '../services/scheduler.service';
import * as wordpressService from '../services/wordpress.service';
import * as bloggerService from '../services/blogger.service';
import * as searchConsoleService from '../services/searchconsole.service';
import * as db from '../db/connection';
import type { QueryResult } from 'pg';

// Helper to create proper QueryResult mock
const createQueryResult = (rows: any[]): QueryResult<any> => ({
  rows,
  command: 'SELECT',
  rowCount: rows.length,
  oid: 0,
  fields: [],
});

// Mock dependencies
vi.mock('../db/connection');
vi.mock('../services/wordpress.service');
vi.mock('../services/blogger.service');
vi.mock('../services/searchconsole.service');
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Scheduler Service - Blogger Support (US-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC-1: Platform Detection', () => {
    it('should detect Blogger platform from site configuration', async () => {
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce(createQueryResult([{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }]))
        .mockResolvedValueOnce(createQueryResult([{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]));

      mockBlogger.setCredentials.mockReturnValue(undefined);
      mockBlogger.publishPost.mockResolvedValue({
        id: 'post-123',
        blogId: 'blog-1',
        title: 'Test',
        url: 'https://test.blogspot.com/post',
      });

      const queueItem: schedulerService.PublishQueueItem = {
        id: 1,
        article_id: 100,
        site_id: 1,
        scheduled_at: new Date(),
        scheduled_timezone: 'Europe/Istanbul',
        jitter_minutes: 0,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        last_attempt_at: null,
        error_message: null,
        published_at: null,
        wordpress_id: null,
        wordpress_url: null,
      };

      await schedulerService.publishArticle(queueItem);

      expect(mockBlogger.publishPost).toHaveBeenCalled();
    });

    it('should detect WordPress platform from site configuration', async () => {
      const mockDb = vi.mocked(db);
      const mockWordpress = vi.mocked(wordpressService);

      mockDb.query
        .mockResolvedValueOnce(createQueryResult([{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }]))
        .mockResolvedValueOnce(createQueryResult([{ id: 1, platform: 'wordpress', api_credentials: { siteUrl: 'https://wp.com', username: 'user', applicationPassword: 'pass' } }]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]));

      mockWordpress.publishPost.mockResolvedValue({
        success: true,
        wordpressId: 123,
        wordpressUrl: 'https://wp.com/post',
        status: 'publish',
      });

      const queueItem: schedulerService.PublishQueueItem = {
        id: 1,
        article_id: 100,
        site_id: 1,
        scheduled_at: new Date(),
        scheduled_timezone: 'Europe/Istanbul',
        jitter_minutes: 0,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        last_attempt_at: null,
        error_message: null,
        published_at: null,
        wordpress_id: null,
        wordpress_url: null,
      };

      await schedulerService.publishArticle(queueItem);

      expect(mockWordpress.publishPost).toHaveBeenCalled();
    });
  });

  describe('AC-2: Blogger Service Integration', () => {
    it('should call blogger.service.publishPost with correct parameters', async () => {
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce(createQueryResult([{ id: 1, title: 'Test Title', content: '<p>Test content</p>', excerpt: null, slug: null, site_id: 1 }]))
        .mockResolvedValueOnce(createQueryResult([{ id: 1, platform: 'blogger', api_credentials: { blogId: 'test-blog-id', accessToken: 'token', refreshToken: 'refresh' } }]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]));

      mockBlogger.setCredentials.mockReturnValue(undefined);
      mockBlogger.publishPost.mockResolvedValue({
        id: 'blogger-post-id',
        blogId: 'test-blog-id',
        title: 'Test Title',
        url: 'https://test.blogspot.com/post/123',
      });

      const queueItem: schedulerService.PublishQueueItem = {
        id: 1,
        article_id: 123,
        site_id: 456,
        scheduled_at: new Date(),
        scheduled_timezone: 'Europe/Istanbul',
        jitter_minutes: 0,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        last_attempt_at: null,
        error_message: null,
        published_at: null,
        wordpress_id: null,
        wordpress_url: null,
      };

      await schedulerService.publishArticle(queueItem);

      expect(mockBlogger.publishPost).toHaveBeenCalledWith(
        expect.objectContaining({
          blogId: 'test-blog-id',
          title: 'Test Title',
          content: '<p>Test content</p>',
          labels: [],
          isDraft: false,
        }),
        123,
        456
      );
    });
  });

  describe('AC-3: Successful Blogger Publish Status Update', () => {
    it('should update status to "published" after successful Blogger publish', async () => {
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce(createQueryResult([{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }]))
        .mockResolvedValueOnce(createQueryResult([{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]));

      mockBlogger.setCredentials.mockReturnValue(undefined);
      mockBlogger.publishPost.mockResolvedValue({
        id: 'post-123',
        blogId: 'blog-1',
        title: 'Test',
        url: 'https://test.blogspot.com/post',
      });

      const queueItem: schedulerService.PublishQueueItem = {
        id: 1,
        article_id: 100,
        site_id: 1,
        scheduled_at: new Date(),
        scheduled_timezone: 'Europe/Istanbul',
        jitter_minutes: 0,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        last_attempt_at: null,
        error_message: null,
        published_at: null,
        wordpress_id: null,
        wordpress_url: null,
      };

      await schedulerService.publishArticle(queueItem);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE publish_queue'),
        expect.arrayContaining(['published'])
      );
    });
  });

  describe('AC-4: Successful Blogger Publish Logs to publish_history', () => {
    it('should log publish to publish_history after successful Blogger publish', async () => {
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce(createQueryResult([{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }]))
        .mockResolvedValueOnce(createQueryResult([{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]));

      mockBlogger.setCredentials.mockReturnValue(undefined);
      mockBlogger.publishPost.mockResolvedValue({
        id: 'post-123',
        blogId: 'blog-1',
        title: 'Test',
        url: 'https://test.blogspot.com/post',
      });

      const queueItem: schedulerService.PublishQueueItem = {
        id: 1,
        article_id: 100,
        site_id: 1,
        scheduled_at: new Date(),
        scheduled_timezone: 'Europe/Istanbul',
        jitter_minutes: 0,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        last_attempt_at: null,
        error_message: null,
        published_at: null,
        wordpress_id: null,
        wordpress_url: null,
      };

      await schedulerService.publishArticle(queueItem);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO publish_history'),
        expect.arrayContaining([100, 1, 'blogger', 'published'])
      );
    });
  });

  describe('AC-5: Failed Blogger Publish Retry Pattern', () => {
    it('should retry failed Blogger publish according to max_attempts', async () => {
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce(createQueryResult([{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }]))
        .mockResolvedValueOnce(createQueryResult([{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]));

      mockBlogger.setCredentials.mockReturnValue(undefined);
      mockBlogger.publishPost.mockRejectedValue(new Error('Blogger API error'));

      const queueItem: schedulerService.PublishQueueItem = {
        id: 1,
        article_id: 100,
        site_id: 1,
        scheduled_at: new Date(),
        scheduled_timezone: 'Europe/Istanbul',
        jitter_minutes: 0,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        last_attempt_at: null,
        error_message: null,
        published_at: null,
        wordpress_id: null,
        wordpress_url: null,
      };

      await expect(schedulerService.publishArticle(queueItem)).rejects.toThrow();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE publish_queue'),
        expect.arrayContaining(['pending'])
      );
    });
  });

  describe('AC-6: Max Retries Marks Article as Failed', () => {
    it('should mark article as failed when attempts >= max_attempts', async () => {
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce(createQueryResult([{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }]))
        .mockResolvedValueOnce(createQueryResult([{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]));

      mockBlogger.setCredentials.mockReturnValue(undefined);
      mockBlogger.publishPost.mockRejectedValue(new Error('Blogger API error'));

      const queueItem: schedulerService.PublishQueueItem = {
        id: 1,
        article_id: 100,
        site_id: 1,
        scheduled_at: new Date(),
        scheduled_timezone: 'Europe/Istanbul',
        jitter_minutes: 0,
        status: 'pending',
        attempts: 2,
        max_attempts: 3,
        last_attempt_at: null,
        error_message: null,
        published_at: null,
        wordpress_id: null,
        wordpress_url: null,
      };

      await expect(schedulerService.publishArticle(queueItem)).rejects.toThrow();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE publish_queue'),
        expect.arrayContaining(['failed'])
      );
    });
  });

  describe('AC-7: WordPress Platform Maintains Existing Behavior', () => {
    it('should maintain backward compatibility with WordPress publishing', async () => {
      const mockDb = vi.mocked(db);
      const mockWordpress = vi.mocked(wordpressService);

      mockDb.query
        .mockResolvedValueOnce(createQueryResult([{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }]))
        .mockResolvedValueOnce(createQueryResult([{ id: 1, platform: 'wordpress', api_credentials: { siteUrl: 'https://wp.com', username: 'user', applicationPassword: 'pass' } }]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]));

      mockWordpress.publishPost.mockResolvedValue({
        success: true,
        wordpressId: 123,
        wordpressUrl: 'https://wp.com/test',
        status: 'publish',
      });

      const queueItem: schedulerService.PublishQueueItem = {
        id: 1,
        article_id: 100,
        site_id: 1,
        scheduled_at: new Date(),
        scheduled_timezone: 'Europe/Istanbul',
        jitter_minutes: 0,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        last_attempt_at: null,
        error_message: null,
        published_at: null,
        wordpress_id: null,
        wordpress_url: null,
      };

      await schedulerService.publishArticle(queueItem);

      expect(mockWordpress.publishPost).toHaveBeenCalled();
    });
  });

  describe('AC-8: Both Platforms Can Be Processed in Same Queue', () => {
    it('should process mixed platform queue items correctly', async () => {
      const mockDb = vi.mocked(db);
      const mockWordpress = vi.mocked(wordpressService);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce(createQueryResult([
          { id: 1, article_id: 100, site_id: 1, scheduled_at: new Date(), scheduled_timezone: 'Europe/Istanbul', jitter_minutes: 0, status: 'pending', attempts: 0, max_attempts: 3, last_attempt_at: null, error_message: null, published_at: null, wordpress_id: null, wordpress_url: null },
          { id: 2, article_id: 101, site_id: 2, scheduled_at: new Date(), scheduled_timezone: 'Europe/Istanbul', jitter_minutes: 0, status: 'pending', attempts: 0, max_attempts: 3, last_attempt_at: null, error_message: null, published_at: null, wordpress_id: null, wordpress_url: null },
        ]))
        .mockResolvedValueOnce(createQueryResult([{ id: 1, title: 'Article 1', content: 'Content 1', excerpt: null, slug: null, site_id: 1 }]))
        .mockResolvedValueOnce(createQueryResult([{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([{ id: 2, title: 'Article 2', content: 'Content 2', excerpt: null, slug: null, site_id: 2 }]))
        .mockResolvedValueOnce(createQueryResult([{ id: 2, platform: 'wordpress', api_credentials: { siteUrl: 'https://wp.com', username: 'user', applicationPassword: 'pass' } }]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]));

      mockBlogger.setCredentials.mockReturnValue(undefined);
      mockBlogger.publishPost.mockResolvedValue({
        id: 'blogger-post',
        blogId: 'blog-1',
        title: 'Article 1',
        url: 'https://blogger.com/post',
      });

      mockWordpress.publishPost.mockResolvedValue({
        success: true,
        wordpressId: 456,
        wordpressUrl: 'https://wp.com/post',
        status: 'publish',
      });

      const result = await schedulerService.processQueue();

      expect(mockBlogger.publishPost).toHaveBeenCalled();
      expect(mockWordpress.publishPost).toHaveBeenCalled();
      expect(result.processed).toBe(2);
      expect(result.published).toBe(2);
    });
  });

  describe('Helper Functions', () => {
    describe('generateJitter', () => {
      it('should generate random jitter within ±15 minutes', () => {
        const jitter1 = schedulerService.generateJitter(15);
        const jitter2 = schedulerService.generateJitter(15);

        expect(jitter1).toBeGreaterThanOrEqual(-15);
        expect(jitter1).toBeLessThanOrEqual(15);
        expect(jitter2).toBeGreaterThanOrEqual(-15);
        expect(jitter2).toBeLessThanOrEqual(15);
      });

      it('should produce variation across multiple calls', () => {
        const jitterValues: number[] = [];
        for (let i = 0; i < 50; i++) {
          jitterValues.push(schedulerService.generateJitter(15));
        }

        const uniqueValues = new Set(jitterValues);
        expect(uniqueValues.size).toBeGreaterThan(1);
      });

      it('should accept custom maxJitterMinutes', () => {
        const jitter = schedulerService.generateJitter(30);

        expect(jitter).toBeGreaterThanOrEqual(-30);
        expect(jitter).toBeLessThanOrEqual(30);
      });
    });

    describe('applyJitter', () => {
      it('should apply jitter to scheduled time', () => {
        const scheduledTime = new Date('2026-01-01T10:00:00');
        const jitteredTime = schedulerService.applyJitter(scheduledTime, 5);

        const expectedTime = new Date('2026-01-01T10:05:00');
        expect(jitteredTime.getTime()).toBe(expectedTime.getTime());
      });

      it('should handle negative jitter correctly', () => {
        const scheduledTime = new Date('2026-01-01T10:00:00');
        const jitteredTime = schedulerService.applyJitter(scheduledTime, -5);

        const expectedTime = new Date('2026-01-01T09:55:00');
        expect(jitteredTime.getTime()).toBe(expectedTime.getTime());
      });
    });
  });

  describe('Integration Workflow Tests', () => {
    it('should have all required scheduler functions', () => {
      expect(schedulerService.publishArticle).toBeDefined();
      expect(schedulerService.getDueArticles).toBeDefined();
      expect(schedulerService.updateQueueStatus).toBeDefined();
      expect(schedulerService.startScheduler).toBeDefined();
      expect(schedulerService.stopScheduler).toBeDefined();
      expect(schedulerService.scheduleArticle).toBeDefined();
      expect(schedulerService.processQueue).toBeDefined();
    });
  });
});
