import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  generateLinkSuggestions,
  applyLinkSuggestion,
  removeInternalLink,
  getArticleInternalLinks,
  autoLinkArticle,
  getLinkStatistics,
  findOrphanedArticles,
  LinkSuggestion,
} from '../services/internallinks.service';

const router = Router();
router.use(authenticate);

// Get link suggestions for an article
router.get('/suggestions/:articleId', async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.articleId as string);
    const maxSuggestions = parseInt(req.query.max as string) || 10;

    if (isNaN(articleId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid article ID',
        },
      });
    }

    const suggestions = await generateLinkSuggestions(articleId, maxSuggestions);

    res.json({
      data: suggestions,
      meta: {
        articleId,
        count: suggestions.length,
      },
    });
  } catch (err: any) {
    if (err.code === 'ARTICLE_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to generate link suggestions',
      },
    });
  }
});

// Apply a link suggestion
router.post('/apply', async (req: AuthRequest, res: Response) => {
  try {
    const { articleId, suggestion } = req.body;

    if (!articleId || !suggestion) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARAMS',
          message: 'articleId and suggestion are required',
        },
      });
    }

    const result = await applyLinkSuggestion(articleId, suggestion as LinkSuggestion);

    if (!result.success) {
      return res.status(422).json({
        error: {
          code: 'APPLY_FAILED',
          message: result.error || 'Failed to apply link',
        },
      });
    }

    res.json({
      data: {
        success: true,
        articleId,
        targetArticleId: suggestion.targetArticleId,
        anchorText: suggestion.anchorText,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to apply link',
      },
    });
  }
});

// Auto-link an article with high-quality suggestions
router.post('/auto-link/:articleId', async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.articleId as string);
    const maxLinks = parseInt(req.body.maxLinks) || 5;

    if (isNaN(articleId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid article ID',
        },
      });
    }

    const result = await autoLinkArticle(articleId, maxLinks);

    res.json({
      data: {
        articleId,
        inserted: result.inserted,
        suggestions: result.suggestions,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to auto-link article',
      },
    });
  }
});

// Get internal links for an article
router.get('/article/:articleId', async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.articleId as string);

    if (isNaN(articleId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid article ID',
        },
      });
    }

    const links = await getArticleInternalLinks(articleId);

    res.json({
      data: links,
      meta: {
        articleId,
        count: links.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to get internal links',
      },
    });
  }
});

// Remove an internal link
router.delete('/:sourceId/:targetId', async (req: AuthRequest, res: Response) => {
  try {
    const sourceId = parseInt(req.params.sourceId as string);
    const targetId = parseInt(req.params.targetId as string);

    if (isNaN(sourceId) || isNaN(targetId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid article IDs',
        },
      });
    }

    const success = await removeInternalLink(sourceId, targetId);

    if (!success) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Internal link not found',
        },
      });
    }

    res.json({
      data: {
        success: true,
        message: 'Internal link removed',
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to remove internal link',
      },
    });
  }
});

// Get link statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const siteId = req.query.site_id ? parseInt(req.query.site_id as string) : undefined;

    const stats = await getLinkStatistics(siteId);

    res.json({
      data: stats,
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to get link statistics',
      },
    });
  }
});

// Get orphaned articles (articles with no incoming internal links)
router.get('/orphaned', async (req: AuthRequest, res: Response) => {
  try {
    const siteId = req.query.site_id ? parseInt(req.query.site_id as string) : undefined;

    const orphaned = await findOrphanedArticles(siteId);

    res.json({
      data: orphaned,
      meta: {
        count: orphaned.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to find orphaned articles',
      },
    });
  }
});

export default router;
