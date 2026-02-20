import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
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
router.post('/feeds', async (req: AuthRequest, res: Response) => {
  try {
    const { name, url, description, category, language, isActive, fetchIntervalMinutes } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and URL are required',
        },
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid URL format',
        },
      });
    }

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
router.get('/feeds/:id', async (req: AuthRequest, res: Response) => {
  try {
    const feedId = parseInt(req.params.id as string, 10);
    if (isNaN(feedId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid feed ID',
        },
      });
    }

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
router.patch('/feeds/:id', async (req: AuthRequest, res: Response) => {
  try {
    const feedId = parseInt(req.params.id as string, 10);
    if (isNaN(feedId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid feed ID',
        },
      });
    }

    const { name, url, description, category, language, isActive, fetchIntervalMinutes } = req.body;

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid URL format',
          },
        });
      }
    }

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
router.delete('/feeds/:id', async (req: AuthRequest, res: Response) => {
  try {
    const feedId = parseInt(req.params.id as string, 10);
    if (isNaN(feedId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid feed ID',
        },
      });
    }

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
router.post('/feeds/:id/fetch', async (req: AuthRequest, res: Response) => {
  try {
    const feedId = parseInt(req.params.id as string, 10);
    if (isNaN(feedId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid feed ID',
        },
      });
    }

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
router.get('/feeds/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const feedId = parseInt(req.params.id as string, 10);
    if (isNaN(feedId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid feed ID',
        },
      });
    }

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
router.get('/feeds/:id/logs', async (req: AuthRequest, res: Response) => {
  try {
    const feedId = parseInt(req.params.id as string, 10);
    if (isNaN(feedId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid feed ID',
        },
      });
    }

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
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'URL is required',
        },
      });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid URL format',
        },
      });
    }

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
router.get('/items', async (req: AuthRequest, res: Response) => {
  try {
    const feedId = req.query.feedId ? parseInt(req.query.feedId as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const processed = req.query.processed !== undefined ? req.query.processed === 'true' : undefined;
    const language = req.query.language as string | undefined;
    const category = req.query.category as string | undefined;

    const result = await getItems({ feedId, limit, offset, processed, language, category });
    res.json({
      data: result.items,
      meta: {
        total: result.total,
        limit,
        offset,
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
router.get('/items/:id', async (req: AuthRequest, res: Response) => {
  try {
    const itemId = parseInt(req.params.id as string, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid item ID',
        },
      });
    }

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
router.patch('/items/:id/processed', async (req: AuthRequest, res: Response) => {
  try {
    const itemId = parseInt(req.params.id as string, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid item ID',
        },
      });
    }

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
router.delete('/items/:id', async (req: AuthRequest, res: Response) => {
  try {
    const itemId = parseInt(req.params.id as string, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid item ID',
        },
      });
    }

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
router.get('/trend-analysis', async (req: AuthRequest, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const limit = parseInt(req.query.limit as string) || 100;
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
    const params: any[] = [];

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
