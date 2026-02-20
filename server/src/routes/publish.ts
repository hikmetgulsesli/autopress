import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { publishService, PublishError } from '../services/publish.service';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);

router.get('/queue', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*, s.name as site_name FROM articles a JOIN sites s ON a.site_id = s.id WHERE a.status = 'scheduled' ORDER BY a.published_at ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT ph.*, a.title as article_title, s.name as site_name 
       FROM publish_history ph 
       JOIN articles a ON ph.article_id = a.id 
       JOIN sites s ON ph.site_id = s.id 
       ORDER BY ph.published_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schedules', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT sc.*, s.name as site_name FROM schedules sc JOIN sites s ON sc.site_id = s.id ORDER BY sc.day_of_week, sc.publish_time');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/publish/publish-now - Publish an article immediately
router.post('/publish-now', async (req: AuthRequest, res: Response) => {
  try {
    const { article_id, site_id } = req.body;

    // Validate input
    if (!article_id || typeof article_id !== 'number') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'article_id is required and must be a number',
        },
      });
    }

    if (!site_id || typeof site_id !== 'number') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'site_id is required and must be a number',
        },
      });
    }

    // Check if article exists and is not already published
    const articleCheck = await query(
      'SELECT status FROM articles WHERE id = $1',
      [article_id]
    );

    if (!articleCheck.rows[0]) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Article not found',
        },
      });
    }

    if (articleCheck.rows[0].status === 'published') {
      return res.status(409).json({
        error: {
          code: 'ALREADY_PUBLISHED',
          message: 'Article is already published',
        },
      });
    }

    // Publish the article
    const result = await publishService.publishArticle(article_id, site_id);

    if (result.success) {
      return res.status(200).json({
        data: {
          article_id,
          site_id,
          platform: result.platform,
          post_id: result.postId,
          published_url: result.publishedUrl,
          status: 'published',
        },
      });
    } else {
      // Publish failed but was handled gracefully
      return res.status(502).json({
        error: {
          code: 'PUBLISH_FAILED',
          message: result.error || 'Failed to publish article',
          platform: result.platform,
        },
      });
    }
  } catch (error) {
    logger.error('Publish now failed', { error, body: req.body });

    if (error instanceof PublishError) {
      return res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while publishing',
      },
    });
  }
});

// GET /api/publish/history/:articleId - Get publish history for an article
router.get('/history/:articleId', async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.articleId);

    if (isNaN(articleId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid article ID',
        },
      });
    }

    const history = await publishService.getPublishHistory(articleId);
    res.json({ data: history });
  } catch (err: any) {
    logger.error('Failed to get publish history', { error: err, articleId: req.params.articleId });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  }
});

export default router;
