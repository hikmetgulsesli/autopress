import Parser from 'rss-parser';
import { query } from '../db/connection';
import { logger } from '../utils/logger';
import cron from 'node-cron';

// Types
export interface RssFeed {
  id: number;
  name: string;
  url: string;
  description: string | null;
  category: string | null;
  language: string;
  is_active: boolean;
  last_fetched_at: Date | null;
  fetch_interval_minutes: number;
  created_at: Date;
  updated_at: Date;
}

export interface RssItem {
  id: number;
  feed_id: number;
  title: string;
  link: string;
  excerpt: string | null;
  content: string | null;
  author: string | null;
  published_at: Date | null;
  fetched_at: Date;
  guid: string | null;
  categories: string[] | null;
  image_url: string | null;
  is_processed: boolean;
  processed_at: Date | null;
}

export interface RssFeedInput {
  name: string;
  url: string;
  description?: string;
  category?: string;
  language?: string;
  fetch_interval_minutes?: number;
}

export interface RssItemInput {
  feed_id: number;
  title: string;
  link: string;
  excerpt?: string;
  content?: string;
  author?: string;
  published_at?: Date;
  guid?: string;
  categories?: string[];
  image_url?: string;
}

export interface RssFetchResult {
  feedId: number;
  itemsFetched: number;
  itemsNew: number;
  itemsDuplicate: number;
  errors: string[];
}

export interface RssFeedStats {
  totalFeeds: number;
  activeFeeds: number;
  totalItems: number;
  unprocessedItems: number;
  lastFetchAt: Date | null;
}

export interface RssServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// RSS Parser instance
const parser = new Parser({
  timeout: 30000,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'AutoPress RSS Aggregator/1.0',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

// Scheduler state
let rssSchedulerTask: cron.ScheduledTask | null = null;
let isFetching = false;

/**
 * Create a new RSS feed
 */
export const createFeed = async (input: RssFeedInput): Promise<RssFeed> => {
  // Validate URL
  if (!input.url || !isValidUrl(input.url)) {
    throw {
      code: 'INVALID_URL',
      message: 'Valid RSS feed URL is required',
    } as RssServiceError;
  }

  // Validate name
  if (!input.name || input.name.trim().length === 0) {
    throw {
      code: 'INVALID_NAME',
      message: 'Feed name is required',
    } as RssServiceError;
  }

  try {
    // Test fetch the feed to validate it works
    await parser.parseURL(input.url);
  } catch (err) {
    throw {
      code: 'FEED_INVALID',
      message: `Could not parse RSS feed at URL: ${input.url}. Please check the URL is correct and accessible.`,
    } as RssServiceError;
  }

  try {
    const result = await query(
      `INSERT INTO rss_feeds (name, url, description, category, language, fetch_interval_minutes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (url) DO UPDATE
       SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = true
       RETURNING *`,
      [
        input.name.trim(),
        input.url.trim(),
        input.description || null,
        input.category || null,
        input.language || 'tr',
        input.fetch_interval_minutes || 60,
      ]
    );

    logger.info(`Created RSS feed: ${input.name} (${input.url})`);
    return result.rows[0] as RssFeed;
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to create RSS feed:', error);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to save RSS feed to database',
      details: { error: error.message },
    } as RssServiceError;
  }
};

/**
 * Get all RSS feeds
 */
export const getFeeds = async (activeOnly: boolean = false): Promise<RssFeed[]> => {
  try {
    const whereClause = activeOnly ? 'WHERE is_active = true' : '';
    const result = await query(
      `SELECT * FROM rss_feeds ${whereClause} ORDER BY name ASC`,
      []
    );
    return result.rows as RssFeed[];
  } catch (err) {
    logger.error('Failed to get RSS feeds:', err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to fetch RSS feeds from database',
    } as RssServiceError;
  }
};

/**
 * Get a single RSS feed by ID
 */
export const getFeedById = async (feedId: number): Promise<RssFeed | null> => {
  try {
    const result = await query(
      `SELECT * FROM rss_feeds WHERE id = $1`,
      [feedId]
    );
    return result.rows[0] as RssFeed || null;
  } catch (err) {
    logger.error(`Failed to get RSS feed ${feedId}:`, err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to fetch RSS feed from database',
    } as RssServiceError;
  }
};

/**
 * Update an RSS feed
 */
export const updateFeed = async (
  feedId: number,
  input: Partial<RssFeedInput>
): Promise<RssFeed | null> => {
  // Validate URL if provided
  if (input.url && !isValidUrl(input.url)) {
    throw {
      code: 'INVALID_URL',
      message: 'Valid RSS feed URL is required',
    } as RssServiceError;
  }

  // Test fetch if URL is being updated
  if (input.url) {
    try {
      await parser.parseURL(input.url);
    } catch (err) {
      throw {
        code: 'FEED_INVALID',
        message: `Could not parse RSS feed at URL: ${input.url}`,
      } as RssServiceError;
    }
  }

  const updates: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(input.name.trim());
  }
  if (input.url !== undefined) {
    updates.push(`url = $${paramIndex++}`);
    params.push(input.url.trim());
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(input.description || null);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    params.push(input.category || null);
  }
  if (input.language !== undefined) {
    updates.push(`language = $${paramIndex++}`);
    params.push(input.language);
  }
  if (input.fetch_interval_minutes !== undefined) {
    updates.push(`fetch_interval_minutes = $${paramIndex++}`);
    params.push(input.fetch_interval_minutes);
  }

  updates.push(`updated_at = NOW()`);
  params.push(feedId);

  try {
    const result = await query(
      `UPDATE rss_feeds SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Updated RSS feed ${feedId}`);
    return result.rows[0] as RssFeed;
  } catch (err) {
    logger.error(`Failed to update RSS feed ${feedId}:`, err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to update RSS feed in database',
    } as RssServiceError;
  }
};

/**
 * Delete an RSS feed
 */
export const deleteFeed = async (feedId: number): Promise<boolean> => {
  try {
    const result = await query(
      `DELETE FROM rss_feeds WHERE id = $1 RETURNING id`,
      [feedId]
    );

    if (result.rows.length > 0) {
      logger.info(`Deleted RSS feed ${feedId}`);
      return true;
    }
    return false;
  } catch (err) {
    logger.error(`Failed to delete RSS feed ${feedId}:`, err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to delete RSS feed from database',
    } as RssServiceError;
  }
};

/**
 * Toggle feed active status
 */
export const toggleFeedActive = async (feedId: number, isActive: boolean): Promise<RssFeed | null> => {
  try {
    const result = await query(
      `UPDATE rss_feeds SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [isActive, feedId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`${isActive ? 'Activated' : 'Deactivated'} RSS feed ${feedId}`);
    return result.rows[0] as RssFeed;
  } catch (err) {
    logger.error(`Failed to toggle RSS feed ${feedId}:`, err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to update RSS feed status',
    } as RssServiceError;
  }
};

/**
 * Check if URL already exists in database
 */
export const checkDuplicateUrl = async (url: string): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT 1 FROM rss_items WHERE link = $1 LIMIT 1`,
      [url]
    );
    return result.rows.length > 0;
  } catch (err) {
    logger.error('Failed to check duplicate URL:', err);
    return false;
  }
};

/**
 * Extract excerpt from content
 */
const extractExcerpt = (content: string | undefined, maxLength: number = 300): string | null => {
  if (!content) return null;
  
  // Remove HTML tags
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Extract image URL from RSS item
 */
const extractImageUrl = (item: any): string | null => {
  // Try media:content
  if (item.mediaContent?.$?.url) {
    return item.mediaContent.$.url;
  }
  
  // Try enclosure
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  
  // Try to extract from content
  if (item['content:encoded'] || item.content) {
    const content = item['content:encoded'] || item.content;
    const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch) {
      return imgMatch[1];
    }
  }
  
  return null;
};

/**
 * Fetch and parse a single RSS feed
 */
export const fetchFeed = async (feedId: number): Promise<RssFetchResult> => {
  const feed = await getFeedById(feedId);
  
  if (!feed) {
    throw {
      code: 'FEED_NOT_FOUND',
      message: `RSS feed ${feedId} not found`,
    } as RssServiceError;
  }

  if (!feed.is_active) {
    throw {
      code: 'FEED_INACTIVE',
      message: `RSS feed ${feedId} is inactive`,
    } as RssServiceError;
  }

  const startTime = Date.now();
  const result: RssFetchResult = {
    feedId,
    itemsFetched: 0,
    itemsNew: 0,
    itemsDuplicate: 0,
    errors: [],
  };

  try {
    const parsed = await parser.parseURL(feed.url);
    const items = parsed.items || [];
    result.itemsFetched = items.length;

    for (const item of items) {
      try {
        const link = item.link || item.guid;
        if (!link) {
          result.errors.push('Item missing link and guid');
          continue;
        }

        // Check for duplicates by URL
        const isDuplicate = await checkDuplicateUrl(link);
        if (isDuplicate) {
          result.itemsDuplicate++;
          continue;
        }

        // Extract data
        const title = (item as any).title || 'Untitled';
        const content = (item as any)['content:encoded'] || (item as any).content || (item as any).summary || '';
        const excerpt = extractExcerpt(content) || (item as any).summary || null;
        const publishedAt = (item as any).pubDate ? new Date((item as any).pubDate) : null;
        const author = (item as any).creator || (item as any).author || null;
        const guid = (item as any).guid || link;
        const categories = (item as any).categories || [];
        const imageUrl = extractImageUrl(item);

        // Insert the item
        await query(
          `INSERT INTO rss_items 
           (feed_id, title, link, excerpt, content, author, published_at, guid, categories, image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (link) DO NOTHING`,
          [
            feedId,
            title,
            link,
            excerpt,
            content,
            author,
            publishedAt,
            guid,
            categories,
            imageUrl,
          ]
        );

        result.itemsNew++;
      } catch (itemErr) {
        const error = itemErr as Error;
        result.errors.push(`Failed to process item: ${error.message}`);
      }
    }

    // Update feed last fetched timestamp
    await query(
      `UPDATE rss_feeds SET last_fetched_at = NOW() WHERE id = $1`,
      [feedId]
    );

    // Log the fetch
    const fetchDuration = Date.now() - startTime;
    await query(
      `INSERT INTO rss_fetch_logs 
       (feed_id, status, items_fetched, items_new, items_duplicate, fetch_duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        feedId,
        result.errors.length > 0 ? 'partial' : 'success',
        result.itemsFetched,
        result.itemsNew,
        result.itemsDuplicate,
        fetchDuration,
      ]
    );

    logger.info(
      `Fetched RSS feed ${feedId}: ${result.itemsNew} new, ${result.itemsDuplicate} duplicates, ${result.errors.length} errors`
    );

    return result;
  } catch (err) {
    const error = err as Error;
    const fetchDuration = Date.now() - startTime;
    
    // Log the error
    await query(
      `INSERT INTO rss_fetch_logs 
       (feed_id, status, error_message, fetch_duration_ms)
       VALUES ($1, $2, $3, $4)`,
      [feedId, 'error', error.message, fetchDuration]
    );

    throw {
      code: 'FETCH_ERROR',
      message: `Failed to fetch RSS feed: ${error.message}`,
    } as RssServiceError;
  }
};

/**
 * Fetch all active RSS feeds
 */
export const fetchAllFeeds = async (): Promise<RssFetchResult[]> => {
  if (isFetching) {
    logger.warn('RSS fetch already in progress, skipping');
    return [];
  }

  isFetching = true;
  const results: RssFetchResult[] = [];

  try {
    const feeds = await getFeeds(true);
    logger.info(`Starting RSS fetch for ${feeds.length} active feeds`);

    for (const feed of feeds) {
      try {
        // Check if enough time has passed since last fetch
        if (feed.last_fetched_at) {
          const lastFetch = new Date(feed.last_fetched_at).getTime();
          const intervalMs = (feed.fetch_interval_minutes || 60) * 60 * 1000;
          if (Date.now() - lastFetch < intervalMs) {
            logger.debug(`Skipping feed ${feed.id}, fetched recently`);
            continue;
          }
        }

        const result = await fetchFeed(feed.id);
        results.push(result);
      } catch (err) {
        const error = err as RssServiceError;
        logger.error(`Failed to fetch feed ${feed.id}:`, error.message);
        results.push({
          feedId: feed.id,
          itemsFetched: 0,
          itemsNew: 0,
          itemsDuplicate: 0,
          errors: [error.message],
        });
      }
    }

    const totalNew = results.reduce((sum, r) => sum + r.itemsNew, 0);
    logger.info(`RSS fetch complete: ${totalNew} new items from ${results.length} feeds`);

    return results;
  } finally {
    isFetching = false;
  }
};

/**
 * Get RSS items with pagination and filtering
 */
export const getItems = async (options: {
  feedId?: number;
  processed?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
} = {}): Promise<{ items: RssItem[]; total: number }> => {
  const { feedId, processed, limit = 50, offset = 0, search, category } = options;

  const conditions: string[] = [];
  const params: (string | number | boolean)[] = [];
  let paramIndex = 1;

  if (feedId !== undefined) {
    conditions.push(`ri.feed_id = $${paramIndex++}`);
    params.push(feedId);
  }

  if (processed !== undefined) {
    conditions.push(`ri.is_processed = $${paramIndex++}`);
    params.push(processed);
  }

  if (search) {
    conditions.push(`(ri.title ILIKE $${paramIndex} OR ri.excerpt ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (category) {
    conditions.push(`rf.category = $${paramIndex++}`);
    params.push(category);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM rss_items ri 
       JOIN rss_feeds rf ON ri.feed_id = rf.id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get items
    params.push(limit, offset);
    const result = await query(
      `SELECT ri.*, rf.name as feed_name, rf.category as feed_category
       FROM rss_items ri
       JOIN rss_feeds rf ON ri.feed_id = rf.id
       ${whereClause}
       ORDER BY ri.published_at DESC NULLS LAST, ri.fetched_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    return {
      items: result.rows as RssItem[],
      total,
    };
  } catch (err) {
    logger.error('Failed to get RSS items:', err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to fetch RSS items from database',
    } as RssServiceError;
  }
};

/**
 * Get a single RSS item by ID
 */
export const getItemById = async (itemId: number): Promise<RssItem | null> => {
  try {
    const result = await query(
      `SELECT ri.*, rf.name as feed_name, rf.category as feed_category
       FROM rss_items ri
       JOIN rss_feeds rf ON ri.feed_id = rf.id
       WHERE ri.id = $1`,
      [itemId]
    );
    return result.rows[0] as RssItem || null;
  } catch (err) {
    logger.error(`Failed to get RSS item ${itemId}:`, err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to fetch RSS item from database',
    } as RssServiceError;
  }
};

/**
 * Mark items as processed
 */
export const markItemsProcessed = async (itemIds: number[]): Promise<number> => {
  try {
    const result = await query(
      `UPDATE rss_items 
       SET is_processed = true, processed_at = NOW() 
       WHERE id = ANY($1)
       RETURNING id`,
      [itemIds]
    );
    return result.rows.length;
  } catch (err) {
    logger.error('Failed to mark items as processed:', err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to update items',
    } as RssServiceError;
  }
};

/**
 * Delete old RSS items
 */
export const deleteOldItems = async (days: number = 30): Promise<number> => {
  try {
    const result = await query(
      `DELETE FROM rss_items 
       WHERE fetched_at < NOW() - INTERVAL '${days} days'
       AND is_processed = true
       RETURNING id`,
      []
    );
    logger.info(`Deleted ${result.rows.length} old RSS items`);
    return result.rows.length;
  } catch (err) {
    logger.error('Failed to delete old items:', err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to delete old items',
    } as RssServiceError;
  }
};

/**
 * Get RSS statistics
 */
export const getStats = async (): Promise<RssFeedStats> => {
  try {
    const feedsResult = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active
       FROM rss_feeds`,
      []
    );

    const itemsResult = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_processed = false) as unprocessed
       FROM rss_items`,
      []
    );

    const lastFetchResult = await query(
      `SELECT MAX(last_fetched_at) as last_fetch FROM rss_feeds`,
      []
    );

    return {
      totalFeeds: parseInt(feedsResult.rows[0].total),
      activeFeeds: parseInt(feedsResult.rows[0].active),
      totalItems: parseInt(itemsResult.rows[0].total),
      unprocessedItems: parseInt(itemsResult.rows[0].unprocessed),
      lastFetchAt: lastFetchResult.rows[0].last_fetch,
    };
  } catch (err) {
    logger.error('Failed to get RSS stats:', err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to fetch RSS statistics',
    } as RssServiceError;
  }
};

/**
 * Get unique categories from feeds
 */
export const getCategories = async (): Promise<string[]> => {
  try {
    const result = await query(
      `SELECT DISTINCT category FROM rss_feeds 
       WHERE category IS NOT NULL AND is_active = true
       ORDER BY category`,
      []
    );
    return result.rows.map((row) => row.category);
  } catch (err) {
    logger.error('Failed to get categories:', err);
    return [];
  }
};

/**
 * Start the RSS scheduler (runs every hour by default)
 */
export const startRssScheduler = (cronExpression: string = '0 * * * *'): void => {
  if (rssSchedulerTask) {
    logger.warn('RSS scheduler is already running');
    return;
  }

  logger.info(`Starting RSS scheduler with cron: ${cronExpression}`);

  rssSchedulerTask = cron.schedule(
    cronExpression,
    async () => {
      try {
        await fetchAllFeeds();
      } catch (err) {
        logger.error('Error in RSS scheduler:', err);
      }
    },
    {
      scheduled: true,
      timezone: 'Europe/Istanbul',
    }
  );

  logger.info('RSS scheduler started successfully');
};

/**
 * Stop the RSS scheduler
 */
export const stopRssScheduler = (): void => {
  if (rssSchedulerTask) {
    rssSchedulerTask.stop();
    rssSchedulerTask = null;
    logger.info('RSS scheduler stopped');
  } else {
    logger.warn('RSS scheduler is not running');
  }
};

/**
 * Get scheduler status
 */
export const getSchedulerStatus = (): {
  running: boolean;
  isFetching: boolean;
} => {
  return {
    running: rssSchedulerTask !== null,
    isFetching,
  };
};

/**
 * Validate URL format
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get recent fetch logs
 */
export const getFetchLogs = async (
  feedId?: number,
  limit: number = 50
): Promise<Array<{
  id: number;
  feed_id: number;
  feed_name: string;
  status: string;
  items_fetched: number;
  items_new: number;
  items_duplicate: number;
  error_message: string | null;
  fetch_duration_ms: number;
  fetched_at: Date;
}>> => {
  try {
    let whereClause = '';
    const params: (number | string)[] = [limit];

    if (feedId) {
      whereClause = 'WHERE fl.feed_id = $2';
      params.push(feedId);
    }

    const result = await query(
      `SELECT fl.*, f.name as feed_name
       FROM rss_fetch_logs fl
       JOIN rss_feeds f ON fl.feed_id = f.id
       ${whereClause}
       ORDER BY fl.fetched_at DESC
       LIMIT $1`,
      params
    );

    return result.rows;
  } catch (err) {
    logger.error('Failed to get fetch logs:', err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to fetch logs',
    } as RssServiceError;
  }
};
