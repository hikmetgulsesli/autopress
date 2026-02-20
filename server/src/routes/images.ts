import { Router, Request, Response } from 'express';
import { searchImages, ImageServiceError } from '../services/image.service';

const router = Router();

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const perPage = req.query.perPage ? parseInt(req.query.perPage as string, 10) : 20;

    const results = await searchImages({ query, page, perPage });
    res.json({ data: results, meta: { page, perPage } });
  } catch (err) {
    const error = err as ImageServiceError;
    const status = error.code === 'MISSING_API_KEY' ? 503
      : ['INVALID_QUERY', 'INVALID_PAGE', 'INVALID_PER_PAGE'].includes(error.code) ? 400
      : error.code === 'AUTH_ERROR' ? 401
      : error.code === 'RATE_LIMITED' ? 429 : 500;
    res.status(status).json({ error: { code: error.code, message: error.message } });
  }
});

export default router;
