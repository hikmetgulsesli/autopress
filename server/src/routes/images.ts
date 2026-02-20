import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import {
  searchImages,
  getPhoto,
  generateAttribution,
  generateAttributionText,
  ImageSearchOptions,
} from '../services/image.service';

const router = Router();
router.use(authenticate);

/**
 * GET /api/images/search
 * Search for images on Unsplash
 * Query params:
 *   - q: search query (required)
 *   - page: page number (default: 1)
 *   - per_page: items per page (default: 12, max: 30)
 *   - orientation: landscape | portrait | squarish (optional)
 */
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { q, page, per_page, orientation } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query (q) is required',
        },
      });
    }

    const options: ImageSearchOptions = {
      query: q,
      page: page ? parseInt(page as string, 10) : 1,
      perPage: per_page ? parseInt(per_page as string, 10) : 12,
    };

    if (orientation && ['landscape', 'portrait', 'squarish'].includes(orientation as string)) {
      options.orientation = orientation as 'landscape' | 'portrait' | 'squarish';
    }

    const results = await searchImages(options);

    res.json({
      data: results.results,
      meta: {
        total: results.total,
        total_pages: results.total_pages,
        page: options.page,
        per_page: options.perPage,
      },
    });
  } catch (err: any) {
    if (err.code === 'MISSING_API_KEY') {
      return res.status(503).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    if (err.code === 'INVALID_QUERY' || err.code === 'QUERY_TOO_LONG') {
      return res.status(400).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    if (err.code === 'RATE_LIMITED') {
      return res.status(429).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    if (err.code === 'AUTH_ERROR') {
      return res.status(401).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    res.status(500).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/images/:id
 * Get a single photo by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (typeof id !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_PHOTO_ID',
          message: 'Photo ID must be a string',
        },
      });
    }

    const photo = await getPhoto(id);

    res.json({
      data: photo,
    });
  } catch (err: any) {
    if (err.code === 'INVALID_PHOTO_ID') {
      return res.status(400).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    if (err.code === 'PHOTO_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    if (err.code === 'MISSING_API_KEY') {
      return res.status(503).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    res.status(500).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/images/:id/attribution
 * Get attribution for a photo
 */
router.get('/:id/attribution', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'html' } = req.query;

    if (typeof id !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_PHOTO_ID',
          message: 'Photo ID must be a string',
        },
      });
    }

    const photo = await getPhoto(id);

    const attribution = format === 'text'
      ? generateAttributionText(photo)
      : generateAttribution(photo);

    res.json({
      data: {
        photo_id: photo.id,
        attribution,
        photographer: {
          name: photo.user.name,
          username: photo.user.username,
          link: `https://unsplash.com/@${photo.user.username}`,
        },
        unsplash_link: photo.links.html,
      },
    });
  } catch (err: any) {
    if (err.code === 'PHOTO_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    res.status(500).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
      },
    });
  }
});

export default router;
