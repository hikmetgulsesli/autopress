import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import {
  scheduleArticleSchema,
  rescheduleArticleSchema,
  articleIdParamSchema,
  publishNowSchema,
} from '../middleware/schemas';
import * as wordpressService from '../services/wordpress.service';
import * as bloggerService from '../services/blogger.service';
import { logger } from '../utils/logger';

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
    res.status(500).json({ error: err.message });
  }
});

// Get publish history
router.get('/history', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        ph.id, ph.article_id, ph.site_id, 
        ph.wordpress_id, ph.wordpress_url,
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// Schedule an article for publishing
router.post('/schedule', validateBody(scheduleArticleSchema), async (req: AuthRequest, res: Response) => {
  const { articleId, siteId, platform, scheduledAt } = req.body;

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
    res.status(500).json({ error: err.message });
  }
});

// Cancel a scheduled publish
router.delete('/schedule/:articleId', validateParams(articleIdParamSchema), async (req: AuthRequest, res: Response) => {
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
    res.status(500).json({ error: err.message });
  }
});

// Reschedule an article
router.patch('/schedule/:articleId', validateParams(articleIdParamSchema), validateBody(rescheduleArticleSchema), async (req: AuthRequest, res: Response) => {
  const { articleId } = req.params;
  const { scheduledAt } = req.body;

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
    res.status(500).json({ error: err.message });
  }
});

// Get site credentials from database
const getSiteCredentials = async (siteId: number): Promise<{
  platform: string;
  api_credentials: Record<string, unknown>;
} | null> => {
  const result = await query(
    'SELECT platform, api_credentials FROM sites WHERE id = $1',
    [siteId]
  );
  return result.rows[0] || null;
};

// Publish immediately
router.post('/publish-now', validateBody(publishNowSchema), async (req: AuthRequest, res: Response) => {
  const { articleId, siteId, platform } = req.body;

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

    // Get site credentials
    const site = await getSiteCredentials(siteId);
    if (!site) {
      res.status(404).json({
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site bulunamadı'
        }
      });
      return;
    }

    // Validate platform matches
    if (site.platform !== platform) {
      res.status(400).json({
        error: {
          code: 'PLATFORM_MISMATCH',
          message: `Site platformu (${site.platform}) istenen platform (${platform}) ile eşleşmiyor`
        }
      });
      return;
    }

    const now = new Date().toISOString();
    let publishResult: {
      success: boolean;
      platformPostId: string;
      publishedUrl: string;
      error?: string;
    };

    try {
      if (platform === 'wordpress') {
        // Set up WordPress credentials from site
        const creds = site.api_credentials as {
          siteUrl?: string;
          username?: string;
          applicationPassword?: string;
        };

        if (!creds?.siteUrl || !creds?.username || !creds?.applicationPassword) {
          throw new Error('WordPress API bilgileri eksik. Site ayarlarından API bilgilerini girin.');
        }

        // Set environment variables for this request
        process.env.WORDPRESS_SITE_URL = creds.siteUrl;
        process.env.WORDPRESS_USERNAME = creds.username;
        process.env.WORDPRESS_APP_PASSWORD = creds.applicationPassword;

        // Publish to WordPress
        const wpResult = await wordpressService.publishPost(articleId, {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt || undefined,
          slug: article.slug || undefined,
          status: 'publish',
        });

        publishResult = {
          success: true,
          platformPostId: wpResult.wordpressId.toString(),
          publishedUrl: wpResult.wordpressUrl,
        };
      } else if (platform === 'blogger') {
        // Set up Blogger credentials from site
        const creds = site.api_credentials as {
          blogId?: string;
          accessToken?: string;
          refreshToken?: string;
          expiryDate?: number;
        };

        if (!creds?.blogId) {
          throw new Error('Blogger Blog ID eksik. Site ayarlarından Blog ID girin.');
        }

        if (!creds?.accessToken) {
          throw new Error('Blogger yetkilendirme bilgileri eksik. Blogger ile yeniden bağlanın.');
        }

        // Set credentials on Blogger service
        bloggerService.setCredentials({
          accessToken: creds.accessToken,
          refreshToken: creds.refreshToken || '',
          expiryDate: creds.expiryDate || Date.now() + 3600 * 1000,
        });

        // Publish to Blogger
        const bloggerResult = await bloggerService.publishPost(
          {
            blogId: creds.blogId,
            title: article.title,
            content: article.content,
            labels: article.tags || [],
            isDraft: false,
          },
          articleId,
          siteId
        );

        publishResult = {
          success: true,
          platformPostId: bloggerResult.id,
          publishedUrl: bloggerResult.url,
        };
      } else {
        throw new Error(`Desteklenmeyen platform: ${platform}`);
      }

      // Update article status with real published URL
      await query(
        `UPDATE articles 
         SET status = 'published', 
             site_id = $1,
             published_at = $2,
             published_url = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [siteId, now, publishResult.publishedUrl, articleId]
      );

      // Add to publish history with real platform data
      await query(
        `INSERT INTO publish_history 
         (article_id, site_id, platform, platform_post_id, status, published_at)
         VALUES ($1, $2, $3, $4, 'success', $5)`,
        [articleId, siteId, platform, publishResult.platformPostId, now]
      );

      logger.info(`Article ${articleId} published successfully to ${platform}: ${publishResult.publishedUrl}`);

      res.json({ 
        success: true,
        message: 'Makale başarıyla yayınlandı',
        data: {
          articleId,
          platform,
          platformPostId: publishResult.platformPostId,
          publishedUrl: publishResult.publishedUrl,
          publishedAt: now,
        }
      });
    } catch (publishError: any) {
      // Log failed publish to history
      const errorMessage = publishError.message || 'Yayınlama hatası';
      
      await query(
        `INSERT INTO publish_history 
         (article_id, site_id, platform, platform_post_id, status, error_message, published_at)
         VALUES ($1, $2, $3, $4, 'failed', $5, $6)`,
        [articleId, siteId, platform, '', errorMessage, now]
      );

      logger.error(`Failed to publish article ${articleId} to ${platform}:`, publishError);

      // Return appropriate error response
      const errorCode = publishError.code || 'PUBLISH_ERROR';
      const statusCode = publishError.statusCode || 500;

      res.status(statusCode).json({
        error: {
          code: errorCode,
          message: errorMessage,
        }
      });
    }
  } catch (err: any) {
    logger.error('Unexpected error in publish-now:', err);
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Beklenmeyen bir hata oluştu'
      }
    });
  }
});

export default router;
