import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Get publish queue (scheduled articles)
router.get('/queue', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        a.id, a.site_id, a.title, a.slug, a.excerpt, a.status,
        a.published_at as scheduled_at,
        s.platform,
        s.name as site_name 
       FROM articles a 
       JOIN sites s ON a.site_id = s.id 
       WHERE a.status = 'scheduled' 
       ORDER BY a.published_at ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Get publish history
router.get('/history', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        ph.id, ph.article_id, ph.site_id, 
        
        ph.platform, ph.platform_post_id, ph.status, ph.error_message,
        ph.published_at,
        a.title as article_title, 
        s.name as site_name 
       FROM publish_history ph 
       JOIN articles a ON ph.article_id = a.id 
       JOIN sites s ON ph.site_id = s.id 
       ORDER BY ph.published_at DESC 
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Get schedules
router.get('/schedules', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT sc.*, s.name as site_name 
       FROM schedules sc 
       JOIN sites s ON sc.site_id = s.id 
       ORDER BY sc.day_of_week, sc.publish_time`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Schedule an article for publishing
router.post('/schedule', async (req: AuthRequest, res: Response) => {
  const { articleId, siteId, platform, scheduledAt } = req.body;

  if (!articleId || !siteId || !platform || !scheduledAt) {
    res.status(400).json({ 
      error: {
        code: 'VALIDATION_ERROR',
        message: 'articleId, siteId, platform ve scheduledAt gereklidir'
      }
    });
    return;
  }

  if (!['wordpress', 'blogger'].includes(platform)) {
    res.status(400).json({ 
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Platform wordpress veya blogger olmalıdır'
      }
    });
    return;
  }

  try {
    // Update article status to scheduled
    await query(
      `UPDATE articles 
       SET status = 'scheduled', 
           site_id = $1, 
           published_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [siteId, scheduledAt, articleId]
    );

    // Add to publish history as pending
    await query(
      `INSERT INTO publish_history 
       (article_id, site_id, platform, status, published_at)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [articleId, siteId, platform, scheduledAt]
    );

    res.status(201).json({ 
      success: true,
      message: 'Makale başarıyla zamanlandı'
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Cancel a scheduled publish
router.delete('/schedule/:articleId', async (req: AuthRequest, res: Response) => {
  const { articleId } = req.params;

  try {
    // Update article status back to draft
    await query(
      `UPDATE articles 
       SET status = 'draft', 
           published_at = NULL,
           updated_at = NOW()
       WHERE id = $1 AND status = 'scheduled'`,
      [articleId]
    );

    // Update publish history status
    await query(
      `UPDATE publish_history 
       SET status = 'cancelled'
       WHERE article_id = $1 AND status = 'pending'`,
      [articleId]
    );

    res.json({ 
      success: true,
      message: 'Zamanlama iptal edildi'
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Reschedule an article
router.patch('/schedule/:articleId', async (req: AuthRequest, res: Response) => {
  const { articleId } = req.params;
  const { scheduledAt } = req.body;

  if (!scheduledAt) {
    res.status(400).json({ 
      error: {
        code: 'VALIDATION_ERROR',
        message: 'scheduledAt gereklidir'
      }
    });
    return;
  }

  try {
    // Update article publish date
    await query(
      `UPDATE articles 
       SET published_at = $1,
           updated_at = NOW()
       WHERE id = $2 AND status = 'scheduled'`,
      [scheduledAt, articleId]
    );

    // Update publish history
    await query(
      `UPDATE publish_history 
       SET published_at = $1
       WHERE article_id = $2 AND status = 'pending'`,
      [scheduledAt, articleId]
    );

    res.json({ 
      success: true,
      message: 'Zamanlama güncellendi'
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Publish immediately
router.post('/publish-now', async (req: AuthRequest, res: Response) => {
  const { articleId, siteId, platform } = req.body;

  if (!articleId || !siteId || !platform) {
    res.status(400).json({ 
      error: {
        code: 'VALIDATION_ERROR',
        message: 'articleId, siteId ve platform gereklidir'
      }
    });
    return;
  }

  try {
    // Get article content
    const articleResult = await query(
      'SELECT * FROM articles WHERE id = $1',
      [articleId]
    );

    if (articleResult.rows.length === 0) {
      res.status(404).json({ 
        error: {
          code: 'NOT_FOUND',
          message: 'Makale bulunamadı'
        }
      });
      return;
    }

    const article = articleResult.rows[0];

    // TODO: Integrate with actual WordPress/Blogger API
    // For now, simulate publishing
    const now = new Date().toISOString();
    
    // Update article status
    await query(
      `UPDATE articles 
       SET status = 'published', 
           site_id = $1,
           published_at = $2,
           published_url = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [siteId, now, `https://example.com/${article.slug}`, articleId]
    );

    // Add to publish history
    await query(
      `INSERT INTO publish_history 
       (article_id, site_id, platform, platform_post_id, status, published_at)
       VALUES ($1, $2, $3, $4, 'success', $5)`,
      [articleId, siteId, platform, `post_${Date.now()}`, now]
    );

    res.json({ 
      success: true,
      message: 'Makale başarıyla yayınlandı',
      data: {
        articleId,
        publishedUrl: `https://example.com/${article.slug}`
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
