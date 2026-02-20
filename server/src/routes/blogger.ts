import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  getAuthUrl,
  exchangeCodeForTokens,
  listBlogs,
  publishPost,
  setCredentials,
  initializeOAuth2Client,
  BloggerTokens,
} from '../services/blogger.service';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

/**
 * GET /api/blogger/auth-url
 * Returns OAuth URL for Blogger authentication
 */
router.get('/auth-url', (_req: AuthRequest, res: Response) => {
  try {
    // Ensure OAuth2 client is initialized
    const credentials = {
      clientId: process.env.BLOGGER_CLIENT_ID || '',
      clientSecret: process.env.BLOGGER_CLIENT_SECRET || '',
      redirectUri: process.env.BLOGGER_REDIRECT_URI || 'http://localhost:4519/api/blogger/callback',
    };

    if (!credentials.clientId || !credentials.clientSecret) {
      return res.status(500).json({
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Blogger OAuth credentials are not configured',
        },
      });
    }

    initializeOAuth2Client(credentials);
    const authUrl = getAuthUrl();

    res.json({ data: { authUrl } });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'AUTH_URL_ERROR',
        message: err.message || 'Failed to generate auth URL',
      },
    });
  }
});

/**
 * POST /api/blogger/callback
 * Exchanges authorization code for tokens
 */
router.post('/callback', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Authorization code is required',
          details: [{ field: 'code', message: 'Code must be a non-empty string' }],
        },
      });
    }

    // Ensure OAuth2 client is initialized
    const credentials = {
      clientId: process.env.BLOGGER_CLIENT_ID || '',
      clientSecret: process.env.BLOGGER_CLIENT_SECRET || '',
      redirectUri: process.env.BLOGGER_REDIRECT_URI || 'http://localhost:4519/api/blogger/callback',
    };

    if (!credentials.clientId || !credentials.clientSecret) {
      return res.status(500).json({
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Blogger OAuth credentials are not configured',
        },
      });
    }

    initializeOAuth2Client(credentials);
    const tokens: BloggerTokens = await exchangeCodeForTokens(code);

    res.json({
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate,
      },
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'CALLBACK_ERROR',
        message: err.message || 'Failed to exchange authorization code',
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
    // Get tokens from request headers or body
    const accessToken = req.headers['x-blogger-access-token'] as string;
    const refreshToken = req.headers['x-blogger-refresh-token'] as string;

    if (!accessToken) {
      return res.status(401).json({
        error: {
          code: 'MISSING_TOKENS',
          message: 'Blogger access token is required. Provide it in X-Blogger-Access-Token header.',
        },
      });
    }

    // Ensure OAuth2 client is initialized
    const credentials = {
      clientId: process.env.BLOGGER_CLIENT_ID || '',
      clientSecret: process.env.BLOGGER_CLIENT_SECRET || '',
      redirectUri: process.env.BLOGGER_REDIRECT_URI || 'http://localhost:4519/api/blogger/callback',
    };

    if (!credentials.clientId || !credentials.clientSecret) {
      return res.status(500).json({
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Blogger OAuth credentials are not configured',
        },
      });
    }

    initializeOAuth2Client(credentials);
    setCredentials({
      accessToken,
      refreshToken: refreshToken || '',
      expiryDate: Date.now() + 3600 * 1000,
    });

    const blogs = await listBlogs();
    res.json({ data: blogs });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'LIST_BLOGS_ERROR',
        message: err.message || 'Failed to list blogs',
      },
    });
  }
});

/**
 * POST /api/blogger/publish
 * Publishes an article to Blogger
 */
router.post('/publish', async (req: AuthRequest, res: Response) => {
  try {
    const { blogId, title, content, labels, isDraft, accessToken, refreshToken } = req.body;

    // Validation
    if (!blogId || typeof blogId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Blog ID is required',
          details: [{ field: 'blogId', message: 'Blog ID must be a non-empty string' }],
        },
      });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title is required',
          details: [{ field: 'title', message: 'Title must be a non-empty string' }],
        },
      });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required',
          details: [{ field: 'content', message: 'Content must be a non-empty string' }],
        },
      });
    }

    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(401).json({
        error: {
          code: 'MISSING_TOKENS',
          message: 'Blogger access token is required',
          details: [{ field: 'accessToken', message: 'Access token must be provided' }],
        },
      });
    }

    // Ensure OAuth2 client is initialized
    const credentials = {
      clientId: process.env.BLOGGER_CLIENT_ID || '',
      clientSecret: process.env.BLOGGER_CLIENT_SECRET || '',
      redirectUri: process.env.BLOGGER_REDIRECT_URI || 'http://localhost:4519/api/blogger/callback',
    };

    if (!credentials.clientId || !credentials.clientSecret) {
      return res.status(500).json({
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Blogger OAuth credentials are not configured',
        },
      });
    }

    initializeOAuth2Client(credentials);
    setCredentials({
      accessToken,
      refreshToken: refreshToken || '',
      expiryDate: Date.now() + 3600 * 1000,
    });

    const post = await publishPost({
      blogId,
      title: title.trim(),
      content: content.trim(),
      labels: Array.isArray(labels) ? labels : [],
      isDraft: isDraft === true,
    });

    res.status(201).json({ data: post });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'PUBLISH_ERROR',
        message: err.message || 'Failed to publish post',
      },
    });
  }
});

export default router;
