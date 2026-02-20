import { Router, Request, Response } from 'express';
import { submitUrlForIndexing, checkUrlIndexStatus, SearchConsoleServiceError } from '../services/searchconsole.service';

const router = Router();

// POST /api/search-console/index
router.post('/index', async (req: Request, res: Response) => {
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

    const result = await submitUrlForIndexing({ url });

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

// GET /api/search-console/status?url=...
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

export default router;
