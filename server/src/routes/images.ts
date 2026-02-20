import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { searchImages, getRandomImage, ImageServiceError } from '../services/image.service';
import { imageSearchQuerySchema, randomImageQuerySchema } from '../middleware/schemas';

const router = Router();
router.use(authenticate);

// GET /api/images/search?q=query&page=1&per_page=12
router.get('/search', validateQuery(imageSearchQuerySchema), async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query.q as string;
    const page = Number(req.query.page);
    const per_page = Number(req.query.per_page);

    const result = await searchImages(q, page, per_page);

    res.json({
      data: result.results,
      meta: {
        total: result.total,
        totalPages: result.totalPages,
        page: result.page,
      },
    });
  } catch (err) {
    const error = err as ImageServiceError;
    
    if (error.code === 'MISSING_API_KEY') {
      return res.status(503).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (error.code === 'AUTH_ERROR') {
      return res.status(503).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (error.code === 'RATE_LIMITED') {
      return res.status(429).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (error.code === 'INVALID_QUERY' || error.code === 'INVALID_PAGE' || error.code === 'INVALID_PER_PAGE') {
      return res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to search images',
      },
    });
  }
});

// GET /api/images/random?q=optional-query
router.get('/random', validateQuery(randomImageQuerySchema), async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
    const image = await getRandomImage(q);
    res.json({ data: image });
  } catch (err) {
    const error = err as ImageServiceError;
    
    if (error.code === 'MISSING_API_KEY' || error.code === 'AUTH_ERROR') {
      return res.status(503).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (error.code === 'RATE_LIMITED') {
      return res.status(429).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to get random image',
      },
    });
  }
});

export default router;
