import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateArticle, ContentGenerationOptions } from '../services/content.service';

const router = Router();
router.use(authenticate);

// POST /api/content/generate - Generate AI content
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { topic, contentType, language, wordCount, keywords } = req.body;

    // Validate required fields
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TOPIC',
          message: 'Topic is required and must be a non-empty string',
        },
      });
    }

    // Validate content type
    const validContentTypes = ['blog', 'listicle', 'howto', 'faq'];
    if (!contentType || !validContentTypes.includes(contentType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: `Content type must be one of: ${validContentTypes.join(', ')}`,
        },
      });
    }

    // Validate language
    const validLanguages = ['TR', 'EN', 'DE', 'FR', 'ES', 'AR'];
    if (!language || !validLanguages.includes(language)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LANGUAGE',
          message: `Language must be one of: ${validLanguages.join(', ')}`,
        },
      });
    }

    // Validate word count
    const wordCountNum = Number(wordCount);
    if (isNaN(wordCountNum) || wordCountNum < 800 || wordCountNum > 2000) {
      return res.status(400).json({
        error: {
          code: 'INVALID_WORD_COUNT',
          message: 'Word count must be between 800 and 2000',
        },
      });
    }

    const options: ContentGenerationOptions = {
      topic: topic.trim(),
      contentType: contentType as ContentGenerationOptions['contentType'],
      language: language as ContentGenerationOptions['language'],
      wordCount: wordCountNum,
      keywords: Array.isArray(keywords) ? keywords.filter(k => typeof k === 'string') : undefined,
    };

    const generatedContent = await generateArticle(options);

    res.json(generatedContent);
  } catch (err: any) {
    // Handle known error types from content service
    if (err.code) {
      const statusMap: Record<string, number> = {
        MISSING_API_KEY: 503,
        INVALID_TOPIC: 400,
        INVALID_CONTENT_TYPE: 400,
        INVALID_LANGUAGE: 400,
        INVALID_WORD_COUNT: 400,
        INVALID_RESPONSE: 500,
        PARSE_ERROR: 500,
        EMPTY_RESPONSE: 500,
        AUTH_ERROR: 503,
        RATE_LIMITED: 429,
        AI_ERROR: 503,
      };

      return res.status(statusMap[err.code] || 500).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
    }

    // Unknown error
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while generating content',
      },
    });
  }
});

export default router;
