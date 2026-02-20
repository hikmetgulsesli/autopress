import Parser from 'rss-parser';
import { query } from '../db/connection';
import { logger } from '../utils/logger';

// RSS Parser instance with custom fields
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'dcCreator'],
    ],
  },
  timeout: 30000,
  maxRedirects: 5,
});

// Types
export interface RSSFeed {
  id?: number;
  name: string;
  url: string;
  description?: string;
  category?: string;
  language?: string;
  isActive: boolean;
  lastFetchedAt?: Date;
  fetchIntervalMinutes: number;
  errorCount: number;
  lastError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RSSItem {
  id?: number;
  feedId: number;
  title: string;
  link: string;
  excerpt?: string;
  content?: string;
  author?: string;
  categories?: string[];
  imageUrl?: string;
  publishedAt?: Date;
  fetchedAt?: Date;
  isProcessed?: boolean;
}

export interface RSSFetchLog {
  id?: number;
  feedId: number;
  status: 'success' | 'error' | 'partial';
  itemsFetched: number;
  itemsNew: number;
  errorMessage?: string;
  fetchDurationMs?: number;
  fetchedAt?: Date;
}

export interface ParsedArticle {
  title: string;
  link: string;
  excerpt: string;
  content?: string;
  author?: string;
  categories: string[];
  imageUrl?: string;
  publishedAt?: Date;
}

export interface RSSServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Create a new RSS feed
export const createFeed = async (feed: Omit<RSSFeed, 'id' | 'createdAt' | 'updatedAt' | 'errorCount' | 'lastFetchedAt'>): Promise<RSSFeed> => {
  const result = await query(
    `INSERT INTO rss_feeds (name, url, description, category, language, is_active, fetch_interval_minutes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [feed.name, feed.url, feed.description || null, feed.category || null, feed.language || 'tr', feed.isActive ?? true, feed.fetchIntervalMinutes || 60]
  );
  return mapFeedFromDB(result.rows[0]);
};

// Get all RSS feeds
export const getFeeds = async (activeOnly: boolean = false): Promise<RSSFeed[]> => {
  let sql = 'SELECT * FROM rss_feeds';
  if (activeOnly) {
    sql += ' WHERE is_active = true';
  }
  sql += ' ORDER BY created_at DESC';
  const result = await query(sql);
  return result.rows.map(mapFeedFromDB);
};

// Get RSS feed by ID
export const getFeedById = async (id: number): Promise<RSSFeed | null> => {
  const result = await query('SELECT * FROM rss_feeds WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return mapFeedFromDB(result.rows[0]);
};

// Update RSS feed
export const updateFeed = async (id: number, updates: Partial<RSSFeed>): Promise<RSSFeed | null> => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(updates.name); }
  if (updates.url !== undefined) { fields.push(`url = $${paramIndex++}`); values.push(updates.url); }
  if (updates.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(updates.description); }
  if (updates.category !== undefined) { fields.push(`category = $${paramIndex++}`); values.push(updates.category); }
  if (updates.language !== undefined) { fields.push(`language = $${paramIndex++}`); values.push(updates.language); }
  if (updates.isActive !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(updates.isActive); }
  if (updates.fetchIntervalMinutes !== undefined) { fields.push(`fetch_interval_minutes = $${paramIndex++}`); values.push(updates.fetchIntervalMinutes); }

  if (fields.length === 0) return getFeedById(id);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await query(
    `UPDATE rss_feeds SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  if (result.rows.length === 0) return null;
  return mapFeedFromDB(result.rows[0]);
};

// Delete RSS feed
export const deleteFeed = async (id: number): Promise<boolean> => {
  const result = await query('DELETE FROM rss_feeds WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
};

// Parse RSS feed and extract articles
export const parseFeed = async (url: string): Promise<ParsedArticle[]> => {
  try {
    const feed = await parser.parseURL(url);
    const articles: ParsedArticle[] = [];

    for (const item of feed.items) {
      const article = extractArticleData(item);
      if (article) {
        articles.push(article);
      }
    }

    return articles;
  } catch (err) {
    const error = err as Error;
    throw {
      code: 'PARSE_ERROR',
      message: `Failed to parse RSS feed: ${error.message}`,
    } as RSSServiceError;
  }
};

// Extract article data from RSS item
const extractArticleData = (item: Parser.Item): ParsedArticle | null => {
  if (!item.title || !item.link) {
    return null;
  }

  // Extract excerpt from content or description
  let excerpt = '';
  if (item.contentSnippet) {
    excerpt = item.contentSnippet.substring(0, 500);
  } else if (item.content) {
    excerpt = stripHtml(item.content).substring(0, 500);
  } else if (item.summary) {
    excerpt = stripHtml(item.summary).substring(0, 500);
  }

  // Extract content
  const content = (item as any).contentEncoded || item.content || item.summary || '';

  // Extract author
  const author = item.creator || (item as any).dcCreator || (item as any).author || '';

  // Extract categories
  const categories: string[] = [];
  if (item.categories && Array.isArray(item.categories)) {
    categories.push(...item.categories.filter(Boolean));
  }

  // Extract image URL
  let imageUrl: string | undefined;
  const mediaContent = (item as any).mediaContent;
  const enclosure = (item as any).enclosure;
  
  if (mediaContent?.$?.url) {
    imageUrl = mediaContent.$.url;
  } else if (enclosure?.url && enclosure?.type?.startsWith('image/')) {
    imageUrl = enclosure.url;
  } else if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
    imageUrl = item.enclosure.url;
  }

  // Parse published date
  let publishedAt: Date | undefined;
  if (item.pubDate) {
    publishedAt = new Date(item.pubDate);
    if (isNaN(publishedAt.getTime())) {
      publishedAt = undefined;
    }
  } else if ((item as any).isoDate) {
    publishedAt = new Date((item as any).isoDate);
    if (isNaN(publishedAt.getTime())) {
      publishedAt = undefined;
    }
  }

  return {
    title: item.title.trim(),
    link: item.link.trim(),
    excerpt: excerpt.trim(),
    content: content.trim(),
    author: author.trim(),
    categories,
    imageUrl,
    publishedAt,
  };
};

// Strip HTML tags from text
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Check if article already exists by URL
export const articleExists = async (link: string): Promise<boolean> => {
  const result = await query('SELECT 1 FROM rss_items WHERE link = $1 LIMIT 1', [link]);
  return result.rows.length > 0;
};

// Save RSS item to database
export const saveRSSItem = async (item: RSSItem): Promise<number> => {
  const result = await query(
    `INSERT INTO rss_items (feed_id, title, link, excerpt, content, author, categories, image_url, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (link) DO NOTHING
     RETURNING id`,
    [
      item.feedId,
      item.title,
      item.link,
      item.excerpt || null,
      item.content || null,
      item.author || null,
      item.categories ? JSON.stringify(item.categories) : null,
      item.imageUrl || null,
      item.publishedAt || null,
    ]
  );
  return result.rows[0]?.id || 0;
};

// Fetch and store feed items
export const fetchFeed = async (feedId: number): Promise<{ fetched: number; new: number }> => {
  const feed = await getFeedById(feedId);
  if (!feed) {
    throw {
      code: 'FEED_NOT_FOUND',
      message: `Feed with id ${feedId} not found`,
    } as RSSServiceError;
  }

  if (!feed.isActive) {
    throw {
      code: 'FEED_INACTIVE',
      message: `Feed ${feed.name} is inactive`,
    } as RSSServiceError;
  }

  const startTime = Date.now();
  let itemsFetched = 0;
  let itemsNew = 0;
  let errorMessage: string | undefined;
  let status: 'success' | 'error' | 'partial' = 'success';

  try {
    const articles = await parseFeed(feed.url);
    itemsFetched = articles.length;

    for (const article of articles) {
      const exists = await articleExists(article.link);
      if (!exists) {
        const itemId = await saveRSSItem({
          feedId,
          title: article.title,
          link: article.link,
          excerpt: article.excerpt,
          content: article.content,
          author: article.author,
          categories: article.categories,
          imageUrl: article.imageUrl,
          publishedAt: article.publishedAt,
        });
        if (itemId > 0) {
          itemsNew++;
        }
      }
    }

    // Update feed last fetched time and reset error count
    await query(
      'UPDATE rss_feeds SET last_fetched_at = CURRENT_TIMESTAMP, error_count = 0, last_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [feedId]
    );

    logger.info(`Fetched ${itemsFetched} items from feed ${feed.name}, ${itemsNew} new`);
  } catch (err) {
    const error = err as RSSServiceError;
    errorMessage = error.message || 'Unknown error';
    status = 'error';

    // Increment error count
    await query(
      'UPDATE rss_feeds SET error_count = error_count + 1, last_error = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [errorMessage, feedId]
    );

    logger.error(`Failed to fetch feed ${feed.name}: ${errorMessage}`);
    throw err;
  } finally {
    // Log fetch attempt
    const fetchDurationMs = Date.now() - startTime;
    await query(
      `INSERT INTO rss_fetch_logs (feed_id, status, items_fetched, items_new, error_message, fetch_duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [feedId, status, itemsFetched, itemsNew, errorMessage || null, fetchDurationMs]
    );
  }

  return { fetched: itemsFetched, new: itemsNew };
};

// Get RSS items
export const getItems = async (options: {
  feedId?: number;
  limit?: number;
  offset?: number;
  processed?: boolean;
  language?: string;
  category?: string;
} = {}): Promise<{ items: RSSItem[]; total: number }> => {
  const { feedId, limit = 50, offset = 0, processed, language, category } = options;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (feedId !== undefined) {
    whereClause += ` AND feed_id = $${paramIndex++}`;
    params.push(feedId);
  }
  if (processed !== undefined) {
    whereClause += ` AND is_processed = $${paramIndex++}`;
    params.push(processed);
  }
  if (language) {
    whereClause += ` AND feed_id IN (SELECT id FROM rss_feeds WHERE language = $${paramIndex++})`;
    params.push(language);
  }
  if (category) {
    whereClause += ` AND feed_id IN (SELECT id FROM rss_feeds WHERE category = $${paramIndex++})`;
    params.push(category);
  }

  const countResult = await query(`SELECT COUNT(*) FROM rss_items ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const itemsResult = await query(
    `SELECT * FROM rss_items ${whereClause} ORDER BY published_at DESC NULLS LAST, fetched_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    items: itemsResult.rows.map(mapItemFromDB),
    total,
  };
};

// Get RSS item by ID
export const getItemById = async (id: number): Promise<RSSItem | null> => {
  const result = await query('SELECT * FROM rss_items WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return mapItemFromDB(result.rows[0]);
};

// Mark item as processed
export const markItemProcessed = async (id: number): Promise<boolean> => {
  const result = await query(
    'UPDATE rss_items SET is_processed = true WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows.length > 0;
};

// Delete RSS item
export const deleteItem = async (id: number): Promise<boolean> => {
  const result = await query('DELETE FROM rss_items WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
};

// Get fetch logs for a feed
export const getFetchLogs = async (feedId: number, limit: number = 20): Promise<RSSFetchLog[]> => {
  const result = await query(
    'SELECT * FROM rss_fetch_logs WHERE feed_id = $1 ORDER BY fetched_at DESC LIMIT $2',
    [feedId, limit]
  );
  return result.rows.map(mapLogFromDB);
};

// Poll all active feeds (called by scheduler)
export const pollAllFeeds = async (): Promise<{ feedId: number; fetched: number; new: number; error?: string }[]> => {
  const feeds = await getFeeds(true);
  const results: { feedId: number; fetched: number; new: number; error?: string }[] = [];

  for (const feed of feeds) {
    // Check if it's time to fetch this feed
    if (feed.lastFetchedAt) {
      const minutesSinceLastFetch = (Date.now() - new Date(feed.lastFetchedAt).getTime()) / (1000 * 60);
      if (minutesSinceLastFetch < feed.fetchIntervalMinutes) {
        continue;
      }
    }

    try {
      const result = await fetchFeed(feed.id!);
      results.push({ feedId: feed.id!, ...result });
    } catch (err) {
      const error = err as RSSServiceError;
      results.push({ feedId: feed.id!, fetched: 0, new: 0, error: error.message });
    }
  }

  return results;
};

// Get feed statistics
export const getFeedStats = async (feedId: number): Promise<{
  totalItems: number;
  unprocessedItems: number;
  lastFetchStatus?: string;
  lastFetchAt?: Date;
  averageFetchDuration: number;
}> => {
  const totalResult = await query('SELECT COUNT(*) FROM rss_items WHERE feed_id = $1', [feedId]);
  const totalItems = parseInt(totalResult.rows[0].count, 10);

  const unprocessedResult = await query('SELECT COUNT(*) FROM rss_items WHERE feed_id = $1 AND is_processed = false', [feedId]);
  const unprocessedItems = parseInt(unprocessedResult.rows[0].count, 10);

  const lastFetchResult = await query(
    'SELECT status, fetched_at, fetch_duration_ms FROM rss_fetch_logs WHERE feed_id = $1 ORDER BY fetched_at DESC LIMIT 1',
    [feedId]
  );

  const avgDurationResult = await query(
    'SELECT AVG(fetch_duration_ms) FROM rss_fetch_logs WHERE feed_id = $1 AND status = \'success\'',
    [feedId]
  );

  return {
    totalItems,
    unprocessedItems,
    lastFetchStatus: lastFetchResult.rows[0]?.status,
    lastFetchAt: lastFetchResult.rows[0]?.fetched_at,
    averageFetchDuration: Math.round(avgDurationResult.rows[0]?.avg || 0),
  };
};

// Database mappers
const mapFeedFromDB = (row: any): RSSFeed => ({
  id: row.id,
  name: row.name,
  url: row.url,
  description: row.description,
  category: row.category,
  language: row.language,
  isActive: row.is_active,
  lastFetchedAt: row.last_fetched_at,
  fetchIntervalMinutes: row.fetch_interval_minutes,
  errorCount: row.error_count,
  lastError: row.last_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapItemFromDB = (row: any): RSSItem => ({
  id: row.id,
  feedId: row.feed_id,
  title: row.title,
  link: row.link,
  excerpt: row.excerpt,
  content: row.content,
  author: row.author,
  categories: row.categories ? JSON.parse(row.categories) : [],
  imageUrl: row.image_url,
  publishedAt: row.published_at,
  fetchedAt: row.fetched_at,
  isProcessed: row.is_processed,
});

const mapLogFromDB = (row: any): RSSFetchLog => ({
  id: row.id,
  feedId: row.feed_id,
  status: row.status,
  itemsFetched: row.items_fetched,
  itemsNew: row.items_new,
  errorMessage: row.error_message,
  fetchDurationMs: row.fetch_duration_ms,
  fetchedAt: row.fetched_at,
});
