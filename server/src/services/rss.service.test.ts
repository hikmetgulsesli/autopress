import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as rssService from './rss.service';
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

// Mock rss-parser
vi.mock('rss-parser', () => {
  return {
    __esModule: true,
    default: class MockParser {
      parseURL = vi.fn();
    },
  };
});

describe('RSS Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFeed', () => {
    it('should create a new RSS feed', async () => {
      const mockFeed = {
        id: 1,
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        description: 'Test description',
        category: 'tech',
        language: 'en',
        is_active: true,
        fetch_interval_minutes: 60,
        error_count: 0,
        last_fetched_at: null,
        last_error: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (query as any).mockResolvedValue({ rows: [mockFeed] });

      const result = await rssService.createFeed({
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        description: 'Test description',
        category: 'tech',
        language: 'en',
        isActive: true,
        fetchIntervalMinutes: 60,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Feed');
      expect(result.url).toBe('https://example.com/feed.xml');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO rss_feeds'),
        expect.arrayContaining(['Test Feed', 'https://example.com/feed.xml'])
      );
    });
  });

  describe('getFeeds', () => {
    it('should return all feeds', async () => {
      const mockFeeds = [
        { id: 1, name: 'Feed 1', url: 'https://example1.com/feed', is_active: true },
        { id: 2, name: 'Feed 2', url: 'https://example2.com/feed', is_active: false },
      ];

      (query as any).mockResolvedValue({ rows: mockFeeds });

      const result = await rssService.getFeeds();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Feed 1');
      expect(result[1].name).toBe('Feed 2');
    });

    it('should return only active feeds when activeOnly is true', async () => {
      const mockFeeds = [
        { id: 1, name: 'Feed 1', url: 'https://example1.com/feed', is_active: true },
      ];

      (query as any).mockResolvedValue({ rows: mockFeeds });

      const result = await rssService.getFeeds(true);

      expect(query).toHaveBeenCalledWith(
        'SELECT * FROM rss_feeds WHERE is_active = true ORDER BY created_at DESC'
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getFeedById', () => {
    it('should return feed by id', async () => {
      const mockFeed = {
        id: 1,
        name: 'Test Feed',
        url: 'https://example.com/feed',
        is_active: true,
      };

      (query as any).mockResolvedValue({ rows: [mockFeed] });

      const result = await rssService.getFeedById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Test Feed');
    });

    it('should return null if feed not found', async () => {
      (query as any).mockResolvedValue({ rows: [] });

      const result = await rssService.getFeedById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateFeed', () => {
    it('should update feed', async () => {
      const mockFeed = {
        id: 1,
        name: 'Updated Feed',
        url: 'https://example.com/feed',
        is_active: true,
      };

      (query as any).mockResolvedValue({ rows: [mockFeed] });

      const result = await rssService.updateFeed(1, { name: 'Updated Feed' });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Feed');
    });

    it('should return null if feed not found', async () => {
      (query as any).mockResolvedValue({ rows: [] });

      const result = await rssService.updateFeed(999, { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('deleteFeed', () => {
    it('should delete feed', async () => {
      (query as any).mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await rssService.deleteFeed(1);

      expect(result).toBe(true);
    });

    it('should return false if feed not found', async () => {
      (query as any).mockResolvedValue({ rows: [] });

      const result = await rssService.deleteFeed(999);

      expect(result).toBe(false);
    });
  });

  describe('articleExists', () => {
    it('should return true if article exists', async () => {
      (query as any).mockResolvedValue({ rows: [{ 1: 1 }] });

      const result = await rssService.articleExists('https://example.com/article');

      expect(result).toBe(true);
    });

    it('should return false if article does not exist', async () => {
      (query as any).mockResolvedValue({ rows: [] });

      const result = await rssService.articleExists('https://example.com/new-article');

      expect(result).toBe(false);
    });
  });

  describe('saveRSSItem', () => {
    it('should save RSS item', async () => {
      (query as any).mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await rssService.saveRSSItem({
        feedId: 1,
        title: 'Test Article',
        link: 'https://example.com/article',
        excerpt: 'Test excerpt',
        content: 'Test content',
        author: 'Test Author',
        categories: ['tech', 'news'],
        imageUrl: 'https://example.com/image.jpg',
        publishedAt: new Date(),
      });

      expect(result).toBe(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO rss_items'),
        expect.any(Array)
      );
    });

    it('should return 0 on conflict', async () => {
      (query as any).mockResolvedValue({ rows: [] });

      const result = await rssService.saveRSSItem({
        feedId: 1,
        title: 'Test Article',
        link: 'https://example.com/article',
      });

      expect(result).toBe(0);
    });
  });

  describe('getItems', () => {
    it('should return RSS items', async () => {
      const mockItems = [
        {
          id: 1,
          feed_id: 1,
          title: 'Article 1',
          link: 'https://example.com/1',
          excerpt: 'Excerpt 1',
          content: 'Content 1',
          author: 'Author 1',
          categories: '[]',
          image_url: null,
          published_at: new Date(),
          fetched_at: new Date(),
          is_processed: false,
        },
        {
          id: 2,
          feed_id: 1,
          title: 'Article 2',
          link: 'https://example.com/2',
          excerpt: 'Excerpt 2',
          content: 'Content 2',
          author: 'Author 2',
          categories: '["tech"]',
          image_url: 'https://example.com/image.jpg',
          published_at: new Date(),
          fetched_at: new Date(),
          is_processed: true,
        },
      ];

      (query as any).mockResolvedValueOnce({ rows: [{ count: '2' }] });
      (query as any).mockResolvedValueOnce({ rows: mockItems });

      const result = await rssService.getItems({ limit: 10, offset: 0 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].title).toBe('Article 1');
    });

    it('should filter by feedId', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ count: '1' }] });
      (query as any).mockResolvedValueOnce({ rows: [] });

      await rssService.getItems({ feedId: 1 });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('feed_id = $1'),
        expect.arrayContaining([1])
      );
    });
  });

  describe('getItemById', () => {
    it('should return item by id', async () => {
      const mockItem = {
        id: 1,
        feed_id: 1,
        title: 'Article 1',
        link: 'https://example.com/1',
        excerpt: 'Excerpt',
        content: 'Content',
        author: 'Author',
        categories: '[]',
        image_url: null,
        published_at: new Date(),
        fetched_at: new Date(),
        is_processed: false,
      };

      (query as any).mockResolvedValue({ rows: [mockItem] });

      const result = await rssService.getItemById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.title).toBe('Article 1');
    });

    it('should return null if item not found', async () => {
      (query as any).mockResolvedValue({ rows: [] });

      const result = await rssService.getItemById(999);

      expect(result).toBeNull();
    });
  });

  describe('markItemProcessed', () => {
    it('should mark item as processed', async () => {
      (query as any).mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await rssService.markItemProcessed(1);

      expect(result).toBe(true);
    });

    it('should return false if item not found', async () => {
      (query as any).mockResolvedValue({ rows: [] });

      const result = await rssService.markItemProcessed(999);

      expect(result).toBe(false);
    });
  });

  describe('deleteItem', () => {
    it('should delete item', async () => {
      (query as any).mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await rssService.deleteItem(1);

      expect(result).toBe(true);
    });

    it('should return false if item not found', async () => {
      (query as any).mockResolvedValue({ rows: [] });

      const result = await rssService.deleteItem(999);

      expect(result).toBe(false);
    });
  });

  describe('getFetchLogs', () => {
    it('should return fetch logs', async () => {
      const mockLogs = [
        {
          id: 1,
          feed_id: 1,
          status: 'success',
          items_fetched: 10,
          items_new: 5,
          error_message: null,
          fetch_duration_ms: 1500,
          fetched_at: new Date(),
        },
      ];

      (query as any).mockResolvedValue({ rows: mockLogs });

      const result = await rssService.getFetchLogs(1, 10);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('success');
      expect(result[0].itemsFetched).toBe(10);
    });
  });

  describe('getFeedStats', () => {
    it('should return feed statistics', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ count: '100' }] });
      (query as any).mockResolvedValueOnce({ rows: [{ count: '20' }] });
      (query as any).mockResolvedValueOnce({
        rows: [{ status: 'success', fetched_at: new Date(), fetch_duration_ms: 1500 }],
      });
      (query as any).mockResolvedValueOnce({ rows: [{ avg: '1200' }] });

      const result = await rssService.getFeedStats(1);

      expect(result.totalItems).toBe(100);
      expect(result.unprocessedItems).toBe(20);
      expect(result.lastFetchStatus).toBe('success');
      expect(result.averageFetchDuration).toBe(1200);
    });
  });

  describe('pollAllFeeds', () => {
    it('should poll all active feeds', async () => {
      const mockFeeds = [
        {
          id: 1,
          name: 'Feed 1',
          url: 'https://example1.com/feed',
          is_active: true,
          fetch_interval_minutes: 60,
          last_fetched_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
        {
          id: 2,
          name: 'Feed 2',
          url: 'https://example2.com/feed',
          is_active: true,
          fetch_interval_minutes: 60,
          last_fetched_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
      ];

      (query as any).mockResolvedValueOnce({ rows: mockFeeds });
      (query as any).mockResolvedValue({ rows: [] });

      const result = await rssService.pollAllFeeds();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
