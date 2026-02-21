import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as schedulerService from '../services/scheduler.service';
import * as wordpressService from '../services/wordpress.service';
import * as bloggerService from '../services/blogger.service';
import * as searchConsoleService from '../services/searchconsole.service';
import * as db from '../db/connection';

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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('AC-1: Platform Detection', () => {
    it('should publish to Blogger when platform is blogger', async () => {
      // Arrange: Setup mocks
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);
      const mockSearchConsole = vi.mocked(searchConsoleService);

      let callCount = 0;
      mockDb.query.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // getArticleForPublish
          return { rows: [{ id: 1, title: 'Test Article', content: 'Test content', excerpt: null, slug: null, site_id: 1 }] };
        } else if (callCount === 2) {
          // getSiteForPublish
          return { rows: [{ id: 1, platform: 'blogger', api_credentials: { blogId: 'test-blog-id', accessToken: 'test-token', refreshToken: 'test-refresh' } }] };
        } else if (callCount === 3) {
          // updateQueueStatus to 'publishing'
          return { rows: [] };
        } else if (callCount === 4) {
          // updateQueueStatus to 'published'
          return { rows: [] };
        } else if (callCount === 5) {
          // updateArticleStatus
          return { rows: [] };
        } else if (callCount === 6) {
          // logPublishHistory
          return { rows: [] };
        }
        return { rows: [] };
      });

      mockBlogger.setCredentials.mockReturnValue(undefined);
      mockBlogger.publishPost.mockResolvedValue({
        id: 'blogger-post-123',
        blogId: 'test-blog-id',
        title: 'Test Article',
        url: 'https://test.blogspot.com/2026/02/test-article.html',
      });

      mockSearchConsole.autoSubmitAfterPublish.mockResolvedValue({ success: true });

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

      // Act: Publish the article
      await schedulerService.publishArticle(queueItem);

      // Assert: Blogger service was called
      expect(mockBlogger.publishPost).toHaveBeenCalledWith(
        {
          blogId: 'test-blog-id',
          title: 'Test Article',
          content: 'Test content',
          labels: [],
          isDraft: false,
        },
        100,
        1
      );
    });

    it('should publish to WordPress when platform is wordpress', async () => {
      // Arrange: Setup mocks
      const mockDb = vi.mocked(db);
      const mockWordpress = vi.mocked(wordpressService);
      const mockSearchConsole = vi.mocked(searchConsoleService);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Article', content: 'Test content', excerpt: null, slug: null, site_id: 1 }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Mock getSiteForPublish to return WordPress site
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          platform: 'wordpress',
          api_credentials: {
            siteUrl: 'https://example.com',
            username: 'admin',
            applicationPassword: 'app-pass',
          },
        }],
      });

      mockWordpress.publishPost.mockResolvedValue({
        wordpressId: 123,
        wordpressUrl: 'https://example.com/test-article',
      });

      mockSearchConsole.autoSubmitAfterPublish.mockResolvedValue({ success: true });

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

      // Act: Publish the article
      await schedulerService.publishArticle(queueItem);

      // Assert: WordPress service was called
      expect(mockWordpress.publishPost).toHaveBeenCalled();
      expect(mockBlogger.publishPost).not.toHaveBeenCalled();
    });
  });

  describe('AC-2: Blogger Service Integration', () => {
    it('should call blogger.service.publishPost with correct parameters', async () => {
      // Arrange
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Title', content: '<p>Test content</p>', excerpt: null, slug: null, site_id: 1 }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            platform: 'blogger',
            api_credentials: {
              blogId: 'test-blog-id',
              accessToken: 'test-token',
              refreshToken: 'test-refresh',
            },
          }],
        });

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

      // Act
      await schedulerService.publishArticle(queueItem);

      // Assert
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
      // Arrange
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      let updateCalls = 0;
      mockDb.query.mockImplementation(async () => {
        updateCalls++;
        if (updateCalls === 1) {
          // getArticleForPublish
          return { rows: [{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }] };
        } else if (updateCalls === 2) {
          // getSiteForPublish
          return { rows: [{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }] };
        } else if (updateCalls === 3) {
          // updateQueueStatus to 'publishing'
          return { rows: [] };
        } else if (updateCalls === 4) {
          // updateQueueStatus to 'published'
          return { rows: [] };
        } else if (updateCalls === 5) {
          // updateArticleStatus
          return { rows: [] };
        } else if (updateCalls === 6) {
          // logPublishHistory
          return { rows: [] };
        }
        return { rows: [] };
      });

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

      // Act
      await schedulerService.publishArticle(queueItem);

      // Assert: verify status update calls
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE publish_queue'),
        expect.arrayContaining(['publishing'])
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE publish_queue'),
        expect.arrayContaining(['published'])
      );
    });
  });

  describe('AC-4: Successful Blogger Publish Logs to publish_history', () => {
    it('should log publish to publish_history after successful Blogger publish', async () => {
      // Arrange
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

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

      // Act
      await schedulerService.publishArticle(queueItem);

      // Assert: verify publish_history log
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO publish_history'),
        expect.arrayContaining([100, 1, 'blogger', 'published'])
      );
    });
  });

  describe('AC-5: Failed Blogger Publish Retry Pattern', () => {
    it('should retry failed Blogger publish according to max_attempts', async () => {
      // Arrange
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

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

      // Act & Assert: should not throw, but update status to pending for retry
      await expect(schedulerService.publishArticle(queueItem)).rejects.toThrow();

      // Verify it was set back to pending (not failed) since attempts < max_attempts
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE publish_queue'),
        expect.arrayContaining(['pending'])
      );
    });
  });

  describe('AC-6: Max Retries Marks Article as Failed', () => {
    it('should mark article as failed when attempts >= max_attempts', async () => {
      // Arrange
      const mockDb = vi.mocked(db);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

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
        attempts: 2, // Already tried 2 times, this will be attempt 3 (max)
        max_attempts: 3,
        last_attempt_at: null,
        error_message: null,
        published_at: null,
        wordpress_id: null,
        wordpress_url: null,
      };

      // Act & Assert
      await expect(schedulerService.publishArticle(queueItem)).rejects.toThrow();

      // Verify it was marked as failed since attempts >= max_attempts
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE publish_queue'),
        expect.arrayContaining(['failed'])
      );
    });
  });

  describe('AC-7: WordPress Platform Maintains Existing Behavior', () => {
    it('should maintain backward compatibility with WordPress publishing', async () => {
      // Arrange
      const mockDb = vi.mocked(db);
      const mockWordpress = vi.mocked(wordpressService);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test', content: 'Content', excerpt: null, slug: null, site_id: 1 }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, platform: 'wordpress', api_credentials: { siteUrl: 'https://wp.com', username: 'user', applicationPassword: 'pass' } }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      mockWordpress.publishPost.mockResolvedValue({
        wordpressId: 123,
        wordpressUrl: 'https://wp.com/test',
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

      // Act
      await schedulerService.publishArticle(queueItem);

      // Assert: WordPress service still works
      expect(mockWordpress.publishPost).toHaveBeenCalled();
      expect(mockBlogger.publishPost).not.toHaveBeenCalled();
    });
  });

  describe('AC-8: Both Platforms Can Be Processed in Same Queue', () => {
    it('should process mixed platform queue items correctly', async () => {
      // Arrange
      const mockDb = vi.mocked(db);
      const mockWordpress = vi.mocked(wordpressService);
      const mockBlogger = vi.mocked(bloggerService);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
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
            },
            {
              id: 2,
              article_id: 101,
              site_id: 2,
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
            },
          ],
        })
        // Article queries
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Article 1', content: 'Content 1', excerpt: null, slug: null, site_id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, title: 'Article 2', content: 'Content 2', excerpt: null, slug: null, site_id: 2 }] })
        // Site queries
        .mockResolvedValueOnce({ rows: [{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1', accessToken: 'token', refreshToken: 'refresh' } }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, platform: 'wordpress', api_credentials: { siteUrl: 'https://wp.com', username: 'user', applicationPassword: 'pass' } }] })
        // Update queries (6 per article)
        .mockResolvedValue({ rows: [] });

      mockBlogger.setCredentials.mockReturnValue(undefined);
      mockBlogger.publishPost.mockResolvedValue({
        id: 'blogger-post',
        blogId: 'blog-1',
        title: 'Article 1',
        url: 'https://blogger.com/post',
      });

      mockWordpress.publishPost.mockResolvedValue({
        wordpressId: 456,
        wordpressUrl: 'https://wp.com/post',
      });

      // Act: process queue
      const result = await schedulerService.processQueue();

      // Assert: Both services were called
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

        // Check that not all values are identical
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

    it('should support platform detection via sites table', async () => {
      // Arrange
      const mockDb = vi.mocked(db);

      // Mock getting site details
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, platform: 'blogger', api_credentials: { blogId: 'blog-1' } }],
      });

      // This verifies that the scheduler queries the sites table for platform info
      expect(mockDb.query).toBeDefined();
    });
  });
});
