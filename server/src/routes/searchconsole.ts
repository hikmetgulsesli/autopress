import { Router, Request, Response } from 'express';
import { 
  submitUrlForIndexing, 
  checkUrlIndexStatus, 
  notifyUrlUpdated,
  notifyUrlDeleted,
  getUrlNotificationMetadata,
  batchSubmitUrls, 
  checkServiceHealth,
  getQuotaInfo,
  SearchConsoleServiceError 
} from '../services/searchconsole.service';

const router = Router();

// GET /api/search-console/health - Check service health
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await checkServiceHealth();
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err) {
    res.status(500).json({
      healthy: false,
      configured: false,
      message: 'Failed to check service health',
    });
  }
});

// GET /api/search-console/quota - Get quota information
router.get('/quota', async (_req: Request, res: Response) => {
  try {
    const quota = getQuotaInfo();
    res.json(quota);
  } catch (err) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get quota information',
      },
    });
  }
});

// POST /api/search-console/index - Submit URL for indexing
router.post('/index', async (req: Request, res: Response) => {
  try {
    const { url, type = 'URL_UPDATED' } = req.body;

    if (!url) {
      res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'URL is required',
        },
      });
      return;
    }

    if (type !== 'URL_UPDATED' && type !== 'URL_DELETED') {
      res.status(400).json({
        error: {
          code: 'INVALID_TYPE',
          message: 'Type must be either URL_UPDATED or URL_DELETED',
        },
      });
      return;
    }

    const result = await submitUrlForIndexing({ url, type });

    res.json(result);
  } catch (err) {
    const error = err as SearchConsoleServiceError;
    
    if (error.code === 'MISSING_CONFIG') {
      res.status(503).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    if (error.code === 'INVALID_URL') {
      res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    if (error.code === 'AUTH_ERROR') {
      res.status(401).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    if (error.code === 'QUOTA_EXCEEDED') {
      res.status(429).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit URL for indexing',
      },
    });
  }
});

// POST /api/search-console/index/notify-update - Quick endpoint for URL_UPDATED
router.post('/index/notify-update', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'URL is required',
        },
      });
      return;
    }

    const result = await notifyUrlUpdated(url);
    res.json(result);
  } catch (err) {
    const error = err as SearchConsoleServiceError;
    
    if (error.code === 'MISSING_CONFIG') {
      res.status(503).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'INVALID_URL') {
      res.status(400).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'AUTH_ERROR') {
      res.status(401).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'QUOTA_EXCEEDED') {
      res.status(429).json({ error: { code: error.code, message: error.message } });
      return;
    }

    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to notify URL update' },
    });
  }
});

// POST /api/search-console/index/notify-delete - Quick endpoint for URL_DELETED
router.post('/index/notify-delete', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'URL is required',
        },
      });
      return;
    }

    const result = await notifyUrlDeleted(url);
    res.json(result);
  } catch (err) {
    const error = err as SearchConsoleServiceError;
    
    if (error.code === 'MISSING_CONFIG') {
      res.status(503).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'INVALID_URL') {
      res.status(400).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'AUTH_ERROR') {
      res.status(401).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'QUOTA_EXCEEDED') {
      res.status(429).json({ error: { code: error.code, message: error.message } });
      return;
    }

    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to notify URL deletion' },
    });
  }
});

// GET /api/search-console/status?url=... - Check indexing status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;

    if (!url) {
      res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'URL query parameter is required',
        },
      });
      return;
    }

    const result = await checkUrlIndexStatus({ url });

    res.json(result);
  } catch (err) {
    const error = err as SearchConsoleServiceError;
    
    if (error.code === 'MISSING_CONFIG') {
      res.status(503).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    if (error.code === 'INVALID_URL') {
      res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    if (error.code === 'AUTH_ERROR') {
      res.status(401).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check URL indexing status',
      },
    });
  }
});

// GET /api/search-console/metadata?url=... - Get URL notification metadata
router.get('/metadata', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;

    if (!url) {
      res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'URL query parameter is required',
        },
      });
      return;
    }

    const result = await getUrlNotificationMetadata(url);

    if (result === null) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'No notification metadata found for this URL',
        },
      });
      return;
    }

    res.json(result);
  } catch (err) {
    const error = err as SearchConsoleServiceError;
    
    if (error.code === 'MISSING_CONFIG') {
      res.status(503).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'INVALID_URL') {
      res.status(400).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'AUTH_ERROR') {
      res.status(401).json({ error: { code: error.code, message: error.message } });
      return;
    }

    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get URL metadata' },
    });
  }
});

// POST /api/search-console/batch - Batch submit URLs
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { urls, type = 'URL_UPDATED' } = req.body;

    if (!urls || !Array.isArray(urls)) {
      res.status(400).json({
        error: {
          code: 'INVALID_URLS',
          message: 'urls array is required',
        },
      });
      return;
    }

    if (type !== 'URL_UPDATED' && type !== 'URL_DELETED') {
      res.status(400).json({
        error: {
          code: 'INVALID_TYPE',
          message: 'Type must be either URL_UPDATED or URL_DELETED',
        },
      });
      return;
    }

    const results = await batchSubmitUrls(urls, type);

    res.json({
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    });
  } catch (err) {
    const error = err as SearchConsoleServiceError;
    
    if (error.code === 'MISSING_CONFIG') {
      res.status(503).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'INVALID_URLS' || error.code === 'BATCH_TOO_LARGE') {
      res.status(400).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'AUTH_ERROR') {
      res.status(401).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error.code === 'QUOTA_EXCEEDED') {
      res.status(429).json({ error: { code: error.code, message: error.message } });
      return;
    }

    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to batch submit URLs' },
    });
  }
});

export default router;
