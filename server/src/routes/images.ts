import { Router, Request, Response } from 'express';
import { searchImages, ImageServiceError } from '../services/image.service';

const router = Router();

// GET /api/images/search?query=nature&page=1&perPage=20
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const perPage = req.query.perPage ? parseInt(req.query.perPage as string, 10) : 20;

    const results = await searchImages({ query, page, perPage });

    res.json({
      data: results,
      meta: {
        page,
        perPage,
      },
    });
  } catch (err) {
    const error = err as ImageServiceError;
    
    if (error.code === 'MISSING_API_KEY') {
      res.status(503).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    if (error.code === 'INVALID_QUERY' || error.code === 'INVALID_PAGE' || error.code === 'INVALID_PER_PAGE') {
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

    if (error.code === 'RATE_LIMITED') {
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
        message: 'Failed to search images',
      },
    });
  }
});

export default router;
