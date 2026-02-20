import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

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
    debug: vi.fn(),
  },
}));

// Mock node-cron
const mockStop = vi.fn();
const mockScheduleFn = vi.fn();
vi.mock('node-cron', () => ({
  default: {
    schedule: (...args: any[]) => {
      mockScheduleFn(args[0], args[1], args[2]);
      return { stop: mockStop };
    },
  },
}));

// Mock rss-parser
const mockParseURL = vi.fn();
vi.mock('rss-parser', () => ({
  default: class Parser {
    parseURL = (...args: any[]) => mockParseURL(...args);
  },
}));

// Import after mocks
import { query } from '../db/connection';
import { logger } from '../utils/logger';
import {
  createFeed,
  getFeeds,
  getFeedById,
  updateFeed,
  deleteFeed,
  toggleFeedActive,
  fetchFeed,
  fetchAllFeeds,
  getItems,
  getItemById,
  markItemsProcessed,
  deleteOldItems,
  getStats,
  getCategories,
  getFetchLogs,
  checkDuplicateUrl,
  startRssScheduler,
  stopRssScheduler,
  getSchedulerStatus,
} from './rss.service';

describe('RssService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParseURL.mockReset();
    mockScheduleFn.mockClear();
    mockStop.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Stop any running scheduler after each test
    stopRssScheduler();
  });

  describe('Feed Management', () => {
    describe('createFeed', () => {
      it('should create a feed with valid input', async () => {
        const mockFeed = {
          id: 1,
          name: 'Test Feed',
          url: 'https://example.com/rss',
          description: 'Test description',
          category: 'tech',
          language: 'tr',
          is_active: true,
          last_fetched_at: null,
          fetch_interval_minutes: 60,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockParseURL.mockResolvedValueOnce({ items: [] });
        (query as Mock).mockResolvedValueOnce({ rows: [mockFeed] });

        const result = await createFeed({
          name: 'Test Feed',
          url: 'https://example.com/rss',
          description: 'Test description',
          category: 'tech',
        });

        expect(result).toEqual(mockFeed);
        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO rss_feeds'),
          expect.arrayContaining(['Test Feed', 'https://example.com/rss'])
        );
      });

      it('should reject invalid URL', async () => {
        await expect(
          createFeed({
            name: 'Test Feed',
            url: 'not-a-valid-url',
          })
        ).rejects.toMatchObject({
          code: 'INVALID_URL',
          message: 'Valid RSS feed URL is required',
        });
      });

      it('should reject empty name', async () => {
        await expect(
          createFeed({
            name: '',
            url: 'https://example.com/rss',
          })
        ).rejects.toMatchObject({
          code: 'INVALID_NAME',
          message: 'Feed name is required',
        });
      });

      it('should reject unreachable feed', async () => {
        mockParseURL.mockRejectedValueOnce(new Error('Network error'));

        await expect(
          createFeed({
            name: 'Test Feed',
            url: 'https://example.com/rss',
          })
        ).rejects.toMatchObject({
          code: 'FEED_INVALID',
        });
      });
    });

    describe('getFeeds', () => {
      it('should return all feeds', async () => {
        const mockFeeds = [
          { id: 1, name: 'Feed 1', is_active: true },
          { id: 2, name: 'Feed 2', is_active: false },
        ];

        (query as Mock).mockResolvedValueOnce({ rows: mockFeeds });

        const result = await getFeeds();

        expect(result).toHaveLength(2);
        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM rss_feeds'),
          []
        );
      });

      it('should return only active feeds when activeOnly is true', async () => {
        const mockFeeds = [{ id: 1, name: 'Feed 1', is_active: true }];

        (query as Mock).mockResolvedValueOnce({ rows: mockFeeds });

        const result = await getFeeds(true);

        expect(result).toHaveLength(1);
        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE is_active = true'),
          []
        );
      });
    });

    describe('getFeedById', () => {
      it('should return feed by id', async () => {
        const mockFeed = { id: 1, name: 'Feed 1' };

        (query as Mock).mockResolvedValueOnce({ rows: [mockFeed] });

        const result = await getFeedById(1);

        expect(result).toEqual(mockFeed);
        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM rss_feeds WHERE id = $1'),
          [1]
        );
      });

      it('should return null for non-existent feed', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [] });

        const result = await getFeedById(999);

        expect(result).toBeNull();
      });
    });

    describe('updateFeed', () => {
      it('should update feed with valid data', async () => {
        const mockFeed = {
          id: 1,
          name: 'Updated Feed',
          url: 'https://example.com/rss',
          description: 'Updated description',
          category: 'news',
          language: 'en',
          is_active: true,
          fetch_interval_minutes: 30,
        };

        mockParseURL.mockResolvedValueOnce({ items: [] });
        (query as Mock).mockResolvedValueOnce({ rows: [mockFeed] });

        const result = await updateFeed(1, {
          name: 'Updated Feed',
          fetch_interval_minutes: 30,
        });

        expect(result).toEqual(mockFeed);
      });

      it('should return null for non-existent feed', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [] });

        const result = await updateFeed(999, { name: 'Updated' });

        expect(result).toBeNull();
      });

      it('should reject invalid URL', async () => {
        await expect(
          updateFeed(1, { url: 'invalid-url' })
        ).rejects.toMatchObject({
          code: 'INVALID_URL',
        });
      });
    });

    describe('deleteFeed', () => {
      it('should delete existing feed', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const result = await deleteFeed(1);

        expect(result).toBe(true);
        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM rss_feeds WHERE id = $1'),
          [1]
        );
      });

      it('should return false for non-existent feed', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [] });

        const result = await deleteFeed(999);

        expect(result).toBe(false);
      });
    });

    describe('toggleFeedActive', () => {
      it('should activate feed', async () => {
        const mockFeed = { id: 1, name: 'Feed 1', is_active: true };

        (query as Mock).mockResolvedValueOnce({ rows: [mockFeed] });

        const result = await toggleFeedActive(1, true);

        expect(result).toEqual(mockFeed);
        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE rss_feeds SET is_active = $1'),
          [true, 1]
        );
      });

      it('should deactivate feed', async () => {
        const mockFeed = { id: 1, name: 'Feed 1', is_active: false };

        (query as Mock).mockResolvedValueOnce({ rows: [mockFeed] });

        const result = await toggleFeedActive(1, false);

        expect(result).toEqual(mockFeed);
      });
    });
  });

  describe('Feed Fetching', () => {
    describe('fetchFeed', () => {
      it('should fetch and parse RSS feed', async () => {
        const mockFeed = {
          id: 1,
          name: 'Test Feed',
          url: 'https://example.com/rss',
          is_active: true,
          fetch_interval_minutes: 60,
        };

        const mockParsedFeed = {
          items: [
            {
              title: 'Article 1',
              link: 'https://example.com/article1',
              content: 'Content 1',
              pubDate: new Date().toISOString(),
            },
          ],
        };

        (query as Mock)
          .mockResolvedValueOnce({ rows: [mockFeed] }) // getFeedById
          .mockResolvedValueOnce({ rows: [] }) // checkDuplicateUrl
          .mockResolvedValueOnce({ rows: [] }) // insert item
          .mockResolvedValueOnce({ rows: [] }) // update last_fetched_at
          .mockResolvedValueOnce({ rows: [] }); // insert log

        mockParseURL.mockResolvedValueOnce(mockParsedFeed);

        const result = await fetchFeed(1);

        expect(result.itemsFetched).toBe(1);
        expect(result.itemsNew).toBe(1);
        expect(result.itemsDuplicate).toBe(0);
      });

      it('should detect duplicate items', async () => {
        const mockFeed = {
          id: 1,
          name: 'Test Feed',
          url: 'https://example.com/rss',
          is_active: true,
        };

        const mockParsedFeed = {
          items: [
            {
              title: 'Article 1',
              link: 'https://example.com/article1',
            },
          ],
        };

        (query as Mock)
          .mockResolvedValueOnce({ rows: [mockFeed] }) // getFeedById
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // checkDuplicateUrl - duplicate found
          .mockResolvedValueOnce({ rows: [] }) // update last_fetched_at
          .mockResolvedValueOnce({ rows: [] }); // insert log

        mockParseURL.mockResolvedValueOnce(mockParsedFeed);

        const result = await fetchFeed(1);

        expect(result.itemsFetched).toBe(1);
        expect(result.itemsNew).toBe(0);
        expect(result.itemsDuplicate).toBe(1);
      });

      it('should throw error for inactive feed', async () => {
        const mockFeed = {
          id: 1,
          name: 'Test Feed',
          url: 'https://example.com/rss',
          is_active: false,
        };

        (query as Mock).mockResolvedValueOnce({ rows: [mockFeed] });

        await expect(fetchFeed(1)).rejects.toMatchObject({
          code: 'FEED_INACTIVE',
        });
      });

      it('should throw error for non-existent feed', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [] });

        await expect(fetchFeed(999)).rejects.toMatchObject({
          code: 'FEED_NOT_FOUND',
        });
      });
    });

    describe('fetchAllFeeds', () => {
      it('should fetch all active feeds', async () => {
        const mockFeeds = [
          { id: 1, name: 'Feed 1', is_active: true, last_fetched_at: null },
          { id: 2, name: 'Feed 2', is_active: true, last_fetched_at: null },
        ];

        (query as Mock)
          .mockResolvedValueOnce({ rows: mockFeeds }) // getFeeds
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // getFeedById
          .mockResolvedValueOnce({ rows: [] }) // checkDuplicateUrl
          .mockResolvedValueOnce({ rows: [] }) // insert item
          .mockResolvedValueOnce({ rows: [] }) // update last_fetched_at
          .mockResolvedValueOnce({ rows: [] }) // insert log
          .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // getFeedById
          .mockResolvedValueOnce({ rows: [] }) // checkDuplicateUrl
          .mockResolvedValueOnce({ rows: [] }) // insert item
          .mockResolvedValueOnce({ rows: [] }) // update last_fetched_at
          .mockResolvedValueOnce({ rows: [] }); // insert log

        mockParseURL
          .mockResolvedValueOnce({
            items: [{ title: 'Article', link: 'https://example.com/article' }],
          })
          .mockResolvedValueOnce({
            items: [{ title: 'Article 2', link: 'https://example.com/article2' }],
          });

        const results = await fetchAllFeeds();

        expect(results).toHaveLength(2);
      });

      it('should skip recently fetched feeds', async () => {
        const recentTime = new Date();
        const mockFeeds = [
          {
            id: 1,
            name: 'Feed 1',
            is_active: true,
            last_fetched_at: recentTime,
            fetch_interval_minutes: 60,
          },
        ];

        (query as Mock).mockResolvedValueOnce({ rows: mockFeeds });

        const results = await fetchAllFeeds();

        expect(results).toHaveLength(0); // Skipped due to recent fetch
      });
    });
  });

  describe('Item Management', () => {
    describe('getItems', () => {
      it('should return items with pagination', async () => {
        const mockItems = [
          { id: 1, title: 'Item 1', feed_id: 1 },
          { id: 2, title: 'Item 2', feed_id: 1 },
        ];

        (query as Mock)
          .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // count
          .mockResolvedValueOnce({ rows: mockItems }); // items

        const result = await getItems({ limit: 2, offset: 0 });

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(10);
      });

      it('should filter by feedId', async () => {
        (query as Mock)
          .mockResolvedValueOnce({ rows: [{ count: '5' }] })
          .mockResolvedValueOnce({ rows: [] });

        await getItems({ feedId: 1 });

        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('ri.feed_id = $1'),
          expect.any(Array)
        );
      });

      it('should filter by processed status', async () => {
        (query as Mock)
          .mockResolvedValueOnce({ rows: [{ count: '3' }] })
          .mockResolvedValueOnce({ rows: [] });

        await getItems({ processed: false });

        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('ri.is_processed = $1'),
          expect.any(Array)
        );
      });

      it('should search by title or excerpt', async () => {
        (query as Mock)
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: [] });

        await getItems({ search: 'test' });

        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('ri.title ILIKE'),
          expect.any(Array)
        );
      });
    });

    describe('getItemById', () => {
      it('should return item by id', async () => {
        const mockItem = { id: 1, title: 'Item 1', feed_id: 1 };

        (query as Mock).mockResolvedValueOnce({ rows: [mockItem] });

        const result = await getItemById(1);

        expect(result).toEqual(mockItem);
      });

      it('should return null for non-existent item', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [] });

        const result = await getItemById(999);

        expect(result).toBeNull();
      });
    });

    describe('markItemsProcessed', () => {
      it('should mark items as processed', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

        const result = await markItemsProcessed([1, 2]);

        expect(result).toBe(2);
        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE rss_items'),
          [[1, 2]]
        );
      });
    });

    describe('deleteOldItems', () => {
      it('should delete old processed items', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

        const result = await deleteOldItems(30);

        expect(result).toBe(2);
      });
    });

    describe('checkDuplicateUrl', () => {
      it('should return true for duplicate URL', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const result = await checkDuplicateUrl('https://example.com/article');

        expect(result).toBe(true);
      });

      it('should return false for new URL', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [] });

        const result = await checkDuplicateUrl('https://example.com/new-article');

        expect(result).toBe(false);
      });
    });
  });

  describe('Statistics and Categories', () => {
    describe('getStats', () => {
      it('should return RSS statistics', async () => {
        (query as Mock)
          .mockResolvedValueOnce({
            rows: [{ total: '5', active: '3' }],
          })
          .mockResolvedValueOnce({
            rows: [{ total: '100', unprocessed: '20' }],
          })
          .mockResolvedValueOnce({
            rows: [{ last_fetch: new Date() }],
          });

        const result = await getStats();

        expect(result.totalFeeds).toBe(5);
        expect(result.activeFeeds).toBe(3);
        expect(result.totalItems).toBe(100);
        expect(result.unprocessedItems).toBe(20);
      });
    });

    describe('getCategories', () => {
      it('should return unique categories', async () => {
        (query as Mock).mockResolvedValueOnce({
          rows: [{ category: 'tech' }, { category: 'news' }],
        });

        const result = await getCategories();

        expect(result).toEqual(['tech', 'news']);
      });
    });

    describe('getFetchLogs', () => {
      it('should return fetch logs', async () => {
        const mockLogs = [
          {
            id: 1,
            feed_id: 1,
            feed_name: 'Feed 1',
            status: 'success',
            items_fetched: 10,
            items_new: 5,
            items_duplicate: 5,
          },
        ];

        (query as Mock).mockResolvedValueOnce({ rows: mockLogs });

        const result = await getFetchLogs();

        expect(result).toHaveLength(1);
        expect(result[0].feed_name).toBe('Feed 1');
      });

      it('should filter by feedId', async () => {
        (query as Mock).mockResolvedValueOnce({ rows: [] });

        await getFetchLogs(1);

        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE fl.feed_id = $2'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Scheduler', () => {
    describe('startRssScheduler', () => {
      it('should start the scheduler', () => {
        startRssScheduler('0 * * * *');

        expect(mockScheduleFn).toHaveBeenCalledWith(
          '0 * * * *',
          expect.any(Function),
          expect.objectContaining({ scheduled: true })
        );
      });

      it('should warn if already running', () => {
        startRssScheduler('0 * * * *');
        startRssScheduler('0 * * * *');

        expect(logger.warn).toHaveBeenCalledWith('RSS scheduler is already running');
      });
    });

    describe('stopRssScheduler', () => {
      it('should stop the scheduler', () => {
        startRssScheduler();
        stopRssScheduler();

        expect(mockStop).toHaveBeenCalled();
      });

      it('should warn if not running', () => {
        stopRssScheduler();

        expect(logger.warn).toHaveBeenCalledWith('RSS scheduler is not running');
      });
    });

    describe('getSchedulerStatus', () => {
      it('should return scheduler status', () => {
        const status = getSchedulerStatus();

        expect(status).toHaveProperty('running');
        expect(status).toHaveProperty('isFetching');
      });
    });
  });
});
