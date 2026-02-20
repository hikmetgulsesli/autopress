import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateArticle, ContentGenerationOptions } from '../services/content.service';

const router = Router();
router.use(authenticate);

// POST /api/content/generate - Generate content using AI
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { topic, contentType, language, wordCount, keywords } = req.body;

    // Validate required fields
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_TOPIC',
          message: 'Topic is required and must be a string',
        },
      });
    }

    if (!contentType || !['blog', 'listicle', 'howto', 'faq'].includes(contentType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content type must be one of: blog, listicle, howto, faq',
        },
      });
    }

    if (!language || !['TR', 'EN', 'DE', 'FR', 'ES', 'AR'].includes(language)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LANGUAGE',
          message: 'Language must be one of: TR, EN, DE, FR, ES, AR',
        },
      });
    }

    const wordCountNum = Number(wordCount) || 1000;

    const options: ContentGenerationOptions = {
      topic: topic.trim(),
      contentType,
      language,
      wordCount: wordCountNum,
      keywords: Array.isArray(keywords) ? keywords : undefined,
    };

    const generatedContent = await generateArticle(options);

    res.json({
      data: generatedContent,
      meta: {
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o',
      },
    });
  } catch (err: any) {
    // Handle specific error codes from content service
    if (err.code) {
      const statusCodes: Record<string, number> = {
        MISSING_API_KEY: 503,
        INVALID_TOPIC: 400,
        INVALID_CONTENT_TYPE: 400,
        INVALID_LANGUAGE: 400,
        INVALID_WORD_COUNT: 400,
        AUTH_ERROR: 503,
        RATE_LIMITED: 429,
        AI_ERROR: 502,
        PARSE_ERROR: 502,
        INVALID_RESPONSE: 502,
        EMPTY_RESPONSE: 502,
      };

      const status = statusCodes[err.code] || 500;
      return res.status(status).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to generate content',
      },
    });
  }
});

export default router;
