import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createPost as createWordPressPost, WordPressConfig } from '../services/wordpress.service';
import { publishPost as publishBloggerPost, setCredentials, PublishPostOptions } from '../services/blogger.service';
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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

    // Get site credentials
    const siteResult = await query(
      'SELECT * FROM sites WHERE id = $1',
      [siteId]
    );

    if (siteResult.rows.length === 0) {
      res.status(404).json({ 
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site bulunamadı'
        }
      });
      return;
    }

    const site = siteResult.rows[0];
    const credentials = site.api_credentials || {};

    let publishedUrl: string;
    let platformPostId: string;

    const now = new Date().toISOString();

    if (platform === 'wordpress') {
      // Validate WordPress credentials
      if (!credentials.siteUrl || !credentials.username || !credentials.applicationPassword) {
        logger.error(`Missing WordPress credentials for site ${siteId}`, {
          siteId,
          credentials: Object.keys(credentials)
        });
        res.status(400).json({
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'WordPress credentials are required: siteUrl, username, and applicationPassword'
          }
        });
        return;
      }

      const wpConfig: WordPressConfig = {
        siteUrl: credentials.siteUrl,
        username: credentials.username,
        applicationPassword: credentials.applicationPassword,
      };

      try {
        const wpResult = await createWordPressPost(wpConfig, {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          slug: article.slug,
          status: 'publish',
        });

        publishedUrl = wpResult.wordpressUrl;
        platformPostId = String(wpResult.wordpressId);

        logger.info(`WordPress post published successfully`, {
          articleId,
          siteId,
          wordpressId: wpResult.wordpressId,
          url: publishedUrl
        });
      } catch (wpError: any) {
        logger.error(`WordPress publish failed`, {
          articleId,
          siteId,
          error: wpError.message,
          code: wpError.code
        });

        // Handle specific WordPress errors
        if (wpError.code === 'AUTH_ERROR') {
          res.status(401).json({
            error: {
              code: 'AUTH_ERROR',
              message: 'WordPress authentication failed. Check your credentials.'
            }
          });
          return;
        }

        if (wpError.code === 'FORBIDDEN') {
          res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient permissions to publish to WordPress.'
            }
          });
          return;
        }

        if (wpError.code === 'API_ERROR') {
          res.status(500).json({
            error: {
              code: 'API_ERROR',
              message: `WordPress API error: ${wpError.message}`
            }
          });
          return;
        }

        // Generic error
        res.status(500).json({
          error: {
            code: 'PUBLISH_FAILED',
            message: wpError.message || 'Failed to publish to WordPress'
          }
        });
        return;
      }
    } else if (platform === 'blogger') {
      // Validate Blogger credentials
      if (!credentials.blogId || !credentials.accessToken || !credentials.refreshToken) {
        logger.error(`Missing Blogger credentials for site ${siteId}`, {
          siteId,
          credentials: Object.keys(credentials)
        });
        res.status(400).json({
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Blogger credentials are required: blogId, accessToken, and refreshToken'
          }
        });
        return;
      }

      try {
        // Set Blogger OAuth credentials
        const bloggerTokens = {
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          expiryDate: credentials.expiryDate || Date.now() + 3600 * 1000,
        };
        setCredentials(bloggerTokens);

        // Publish to Blogger
        const bloggerOptions: PublishPostOptions = {
          blogId: credentials.blogId,
          title: article.title,
          content: article.content,
          labels: [],
          isDraft: false,
        };

        const bloggerResult = await publishBloggerPost(bloggerOptions, articleId, siteId);

        publishedUrl = bloggerResult.url;
        platformPostId = bloggerResult.id;

        logger.info(`Blogger post published successfully`, {
          articleId,
          siteId,
          postId: bloggerResult.id,
          url: publishedUrl
        });
      } catch (bloggerError: any) {
        logger.error(`Blogger publish failed`, {
          articleId,
          siteId,
          error: bloggerError.message,
          code: bloggerError.code
        });

        // Handle specific Blogger errors
        if (bloggerError.code === 'AUTH_ERROR' || bloggerError.code === 'OAUTH_NOT_INITIALIZED') {
          res.status(401).json({
            error: {
              code: 'AUTH_ERROR',
              message: 'Blogger authentication failed. Please re-authenticate.'
            }
          });
          return;
        }

        if (bloggerError.code === 'FORBIDDEN') {
          res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to publish to this Blogger blog.'
            }
          });
          return;
        }

        if (bloggerError.code === 'BLOG_NOT_FOUND') {
          res.status(404).json({
            error: {
              code: 'BLOG_NOT_FOUND',
              message: 'Blogger blog not found. Check your blog ID.'
            }
          });
          return;
        }

        if (bloggerError.code === 'INVALID_REQUEST') {
          res.status(400).json({
            error: {
              code: 'INVALID_REQUEST',
              message: `Invalid Blogger request: ${bloggerError.message}`
            }
          });
          return;
        }

        // Generic error
        res.status(500).json({
          error: {
            code: 'PUBLISH_FAILED',
            message: bloggerError.message || 'Failed to publish to Blogger'
          }
        });
        return;
      }
    } else {
      res.status(400).json({
        error: {
          code: 'INVALID_PLATFORM',
          message: 'Invalid platform. Supported platforms: wordpress, blogger'
        }
      });
      return;
    }

    // Update article status
    await query(
      `UPDATE articles 
       SET status = 'published', 
           site_id = $1,
           published_at = $2,
           published_url = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [siteId, now, publishedUrl, articleId]
    );

    // Add to publish history
    await query(
      `INSERT INTO publish_history 
       (article_id, site_id, platform, platform_post_id, status, published_at)
       VALUES ($1, $2, $3, $4, 'success', $5)`,
      [articleId, siteId, platform, platformPostId, now]
    );

    res.json({ 
      success: true,
      message: 'Makale başarıyla yayınlandı',
      data: {
        articleId,
        publishedUrl,
        platformPostId,
        publishedAt: now
      }
    });
  } catch (err: any) {
    logger.error(`Unexpected error in /publish-now`, {
      articleId,
      siteId,
      platform,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred'
      }
    });
  }
});

export default router;
