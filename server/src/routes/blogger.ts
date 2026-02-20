import { Router, Response } from 'express';
import { google } from 'googleapis';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);

// OAuth2 client configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.BLOGGER_CLIENT_ID,
  process.env.BLOGGER_CLIENT_SECRET,
  process.env.BLOGGER_REDIRECT_URI || 'http://localhost:4519/api/blogger/callback'
);

const blogger = google.blogger({
  version: 'v3',
  auth: oauth2Client,
});

// Schemas
const callbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
});

const publishSchema = z.object({
  blogId: z.string().min(1, 'Blog ID is required'),
  articleId: z.coerce.number().int().positive('Valid article ID is required'),
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  labels: z.array(z.string()).optional(),
});

/**
 * GET /api/blogger/auth-url
 * Returns the OAuth URL for Blogger authentication
 */
router.get('/auth-url', (_req: AuthRequest, res: Response) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/blogger',
      'https://www.googleapis.com/auth/blogger.readonly',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      prompt: 'consent',
    });

    res.json({
      success: true,
      data: { authUrl: url },
    });
  } catch (err: any) {
    logger.error('Failed to generate auth URL:', err);
    res.status(500).json({
      error: {
        code: 'OAUTH_ERROR',
        message: 'Failed to generate auth URL',
        details: err.message,
      },
    });
  }
});

/**
 * POST /api/blogger/callback
 * Exchanges authorization code for tokens
 */
router.post('/callback', validateBody(callbackSchema), async (req: AuthRequest, res: Response) => {
  const { code } = req.body;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in database for the user
    await query(
      `INSERT INTO user_oauth_tokens (user_id, provider, access_token, refresh_token, expiry_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, provider) 
       DO UPDATE SET 
         access_token = $3, 
         refresh_token = COALESCE($4, user_oauth_tokens.refresh_token),
         expiry_date = $5,
         updated_at = NOW()`,
      [
        req.user!.id,
        'blogger',
        tokens.access_token,
        tokens.refresh_token || null,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      ]
    );

    res.json({
      success: true,
      message: 'Blogger authentication successful',
      data: {
        accessToken: tokens.access_token,
        expiryDate: tokens.expiry_date,
      },
    });
  } catch (err: any) {
    logger.error('Failed to exchange code for tokens:', err);
    res.status(400).json({
      error: {
        code: 'TOKEN_EXCHANGE_ERROR',
        message: 'Failed to exchange authorization code',
        details: err.message,
      },
    });
  }
});

/**
 * GET /api/blogger/blogs
 * Lists user's Blogger blogs
 */
router.get('/blogs', async (req: AuthRequest, res: Response) => {
  try {
    // Get stored tokens for user
    const tokenResult = await query(
      'SELECT * FROM user_oauth_tokens WHERE user_id = $1 AND provider = $2',
      [req.user!.id, 'blogger']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Blogger authentication required. Please authenticate first.',
        },
      });
    }

    const tokenData = tokenResult.rows[0];
    
    // Set credentials
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    });

    // Get user's blogs
    const response = await blogger.blogs.listByUser({
      userId: 'self',
    });

    const blogs = response.data.items || [];

    res.json({
      success: true,
      data: blogs.map((blog: any) => ({
        id: blog.id,
        name: blog.name,
        url: blog.url,
        description: blog.description,
        published: blog.published,
        updated: blog.updated,
      })),
    });
  } catch (err: any) {
    logger.error('Failed to list blogs:', err);
    
    // Handle token expiration
    if (err.code === 401 || err.message?.includes('invalid_token')) {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Blogger token expired. Please re-authenticate.',
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'BLOGS_FETCH_ERROR',
        message: 'Failed to fetch blogs',
        details: err.message,
      },
    });
  }
});

/**
 * POST /api/blogger/publish
 * Publishes an article to Blogger
 */
router.post('/publish', validateBody(publishSchema), async (req: AuthRequest, res: Response) => {
  const { blogId, articleId, title, content, labels } = req.body;

  try {
    // Get stored tokens for user
    const tokenResult = await query(
      'SELECT * FROM user_oauth_tokens WHERE user_id = $1 AND provider = $2',
      [req.user!.id, 'blogger']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Blogger authentication required. Please authenticate first.',
        },
      });
    }

    const tokenData = tokenResult.rows[0];
    
    // Set credentials
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    });

    // Publish post to Blogger
    const postResponse = await blogger.posts.insert({
      blogId: blogId,
      requestBody: {
        title: title,
        content: content,
        labels: labels || [],
      },
    });

    const post = postResponse.data;

    // Update article status in database
    await query(
      `UPDATE articles 
       SET status = 'published', 
           published_at = NOW(),
           published_url = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [post.url, articleId]
    );

    // Add to publish history
    await query(
      `INSERT INTO publish_history 
       (article_id, site_id, platform, platform_post_id, status, published_at, published_url)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [articleId, blogId, 'blogger', post.id, 'success', post.url]
    );

    res.json({
      success: true,
      message: 'Article published successfully to Blogger',
      data: {
        postId: post.id,
        url: post.url,
        title: post.title,
        published: post.published,
      },
    });
  } catch (err: any) {
    logger.error('Failed to publish post:', err);
    
    // Handle token expiration
    if (err.code === 401 || err.message?.includes('invalid_token')) {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Blogger token expired. Please re-authenticate.',
        },
      });
    }

    // Log the error
    await query(
      `INSERT INTO publish_history 
       (article_id, site_id, platform, status, error_message, published_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [articleId, blogId, 'blogger', 'failed', err.message]
    );

    res.status(500).json({
      error: {
        code: 'PUBLISH_ERROR',
        message: 'Failed to publish article to Blogger',
        details: err.message,
      },
    });
  }
});

export default router;
