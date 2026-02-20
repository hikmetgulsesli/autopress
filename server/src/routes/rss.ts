import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import {
  createFeed,
  getFeeds,
  getFeedById,
  updateFeed,
  deleteFeed,
  fetchFeed,
  getItems,
  getItemById,
  markItemProcessed,
  deleteItem,
  getFetchLogs,
  pollAllFeeds,
  getFeedStats,
  parseFeed,
} from '../services/rss.service';
import {
  createFeedSchema,
  updateFeedSchema,
  feedIdParamSchema,
  testFeedSchema,
  rssItemsQuerySchema,
  rssItemIdParamSchema,
  trendAnalysisQuerySchema,
} from '../middleware/schemas';

const router = Router();
router.use(authenticate);

// Get all RSS feeds
router.get('/feeds', async (req: AuthRequest, res: Response) => {
  try {
    const { active } = req.query;
    const feeds = await getFeeds(active === 'true');
    res.json({ data: feeds });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: err.message || 'Failed to fetch feeds',
      },
    });
  }
});

// Create new RSS feed
router.post('/feeds', validateBody(createFeedSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, url, description, category, language, isActive, fetchIntervalMinutes } = req.body;

    const feed = await createFeed({
      name,
      url,
      description,
      category,
      language,
      isActive,
      fetchIntervalMinutes,
    });

    res.status(201).json({ data: feed });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_FEED',
          message: 'A feed with this URL already exists',
        },
      });
    }
    res.status(500).json({
      error: {
        code: 'CREATE_ERROR',
        message: err.message || 'Failed to create feed',
      },
    });
  }
});

// Get RSS feed by ID
router.get('/feeds/:id', validateParams(feedIdParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const feedId = req.params.id as unknown as number;
    const feed = await getFeedById(feedId);
    if (!feed) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Feed not found',
        },
      });
    }

    res.json({ data: feed });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: err.message || 'Failed to fetch feed',
      },
    });
  }
});

// Update RSS feed
router.patch('/feeds/:id', validateParams(feedIdParamSchema), validateBody(updateFeedSchema), async (req: AuthRequest, res: Response) => {
  try {
    const feedId = req.params.id as unknown as number;
    const { name, url, description, category, language, isActive, fetchIntervalMinutes } = req.body;

    const feed = await updateFeed(feedId, {
      name,
      url,
      description,
      category,
      language,
      isActive,
      fetchIntervalMinutes,
    });

    if (!feed) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Feed not found',
        },
      });
    }

    res.json({ data: feed });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_FEED',
          message: 'A feed with this URL already exists',
        },
      });
    }
    res.status(500).json({
      error: {
        code: 'UPDATE_ERROR',
        message: err.message || 'Failed to update feed',
      },
    });
  }
});

// Delete RSS feed
router.delete('/feeds/:id', validateParams(feedIdParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const feedId = req.params.id as unknown as number;
    const deleted = await deleteFeed(feedId);
    if (!deleted) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Feed not found',
        },
      });
    }

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'DELETE_ERROR',
        message: err.message || 'Failed to delete feed',
      },
    });
  }
});

// Fetch feed manually
router.post('/feeds/:id/fetch', validateParams(feedIdParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const feedId = req.params.id as unknown as number;
    const result = await fetchFeed(feedId);
    res.json({ data: result });
  } catch (err: any) {
    const statusCode = err.code === 'FEED_NOT_FOUND' ? 404 : err.code === 'FEED_INACTIVE' ? 400 : 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'FETCH_ERROR',
        message: err.message || 'Failed to fetch feed',
      },
    });
  }
});

// Get feed statistics
router.get('/feeds/:id/stats', validateParams(feedIdParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const feedId = req.params.id as unknown as number;
    const stats = await getFeedStats(feedId);
    res.json({ data: stats });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: err.message || 'Failed to fetch feed stats',
      },
    });
  }
});

// Get fetch logs for a feed
router.get('/feeds/:id/logs', validateParams(feedIdParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const feedId = req.params.id as unknown as number;
    const limit = parseInt(req.query.limit as string) || 20;
    const logs = await getFetchLogs(feedId, limit);
    res.json({ data: logs });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: err.message || 'Failed to fetch logs',
      },
    });
  }
});

// Test feed URL (parse without saving)
router.post('/test', validateBody(testFeedSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;

    const articles = await parseFeed(url);
    res.json({
      data: {
        url,
        articleCount: articles.length,
        sample: articles.slice(0, 3),
      },
    });
  } catch (err: any) {
    res.status(400).json({
      error: {
        code: err.code || 'PARSE_ERROR',
        message: err.message || 'Failed to parse feed',
      },
    });
  }
});

// Get RSS items
router.get('/items', validateQuery(rssItemsQuerySchema), async (req: AuthRequest, res: Response) => {
  try {
    const { feedId, limit, offset, processed, language, category } = req.query;

    const result = await getItems({
      feedId: feedId as number | undefined,
      limit: limit as number,
      offset: offset as number,
      processed: processed as boolean | undefined,
      language: language as string | undefined,
      category: category as string | undefined,
    });
    res.json({
      data: result.items,
      meta: {
        total: result.total,
        limit: limit as number,
        offset: offset as number,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: err.message || 'Failed to fetch items',
      },
    });
  }
});

// Get RSS item by ID
router.get('/items/:id', validateParams(rssItemIdParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const itemId = req.params.id as unknown as number;
    const item = await getItemById(itemId);
    if (!item) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Item not found',
        },
      });
    }

    res.json({ data: item });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: err.message || 'Failed to fetch item',
      },
    });
  }
});

// Mark item as processed
router.patch('/items/:id/processed', validateParams(rssItemIdParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const itemId = req.params.id as unknown as number;
    const updated = await markItemProcessed(itemId);
    if (!updated) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Item not found',
        },
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'UPDATE_ERROR',
        message: err.message || 'Failed to mark item as processed',
      },
    });
  }
});

// Delete RSS item
router.delete('/items/:id', validateParams(rssItemIdParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const itemId = req.params.id as unknown as number;
    const deleted = await deleteItem(itemId);
    if (!deleted) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Item not found',
        },
      });
    }

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'DELETE_ERROR',
        message: err.message || 'Failed to delete item',
      },
    });
  }
});

// Poll all feeds (admin endpoint)
router.post('/poll', async (req: AuthRequest, res: Response) => {
  try {
    const results = await pollAllFeeds();
    res.json({ data: results });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'POLL_ERROR',
        message: err.message || 'Failed to poll feeds',
      },
    });
  }
});

// Get RSS items for trend analysis
router.get('/trend-analysis', validateQuery(trendAnalysisQuerySchema), async (req: AuthRequest, res: Response) => {
  try {
    const hours = req.query.hours as unknown as number;
    const limit = req.query.limit as unknown as number;
    const language = req.query.language as string | undefined;

    let sql = `
      SELECT 
        ri.id,
        ri.title,
        ri.link,
        ri.excerpt,
        ri.author,
        ri.categories,
        ri.image_url,
        ri.published_at,
        ri.fetched_at,
        rf.name as feed_name,
        rf.category as feed_category,
        rf.language as feed_language
      FROM rss_items ri
      JOIN rss_feeds rf ON ri.feed_id = rf.id
      WHERE ri.fetched_at > NOW() - INTERVAL '${hours} hours'
    `;
    const params: unknown[] = [];

    if (language) {
      sql += ` AND rf.language = $1`;
      params.push(language);
    }

    sql += ` ORDER BY ri.published_at DESC NULLS LAST LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: err.message || 'Failed to fetch trend analysis data',
      },
    });
  }
});

export default router;
