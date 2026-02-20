import { describe, it, expect, beforeEach } from 'vitest';
import { generateArticle } from '../services/content.service';

describe('ContentService', () => {
  beforeEach(() => {
    // Ensure no API key is set for validation-only tests
    delete process.env.OPENAI_API_KEY;
  });

  describe('Input Validation', () => {
    it('should reject empty topic', async () => {
      await expect(
        generateArticle({
          topic: '',
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
        })
      ).rejects.toMatchObject({
        code: 'INVALID_TOPIC',
        message: 'Topic is required',
      });
    });

    it('should reject invalid content type', async () => {
      await expect(
        generateArticle({
          topic: 'Test Topic',
          contentType: 'invalid' as any,
          language: 'EN',
          wordCount: 1000,
        })
      ).rejects.toMatchObject({
        code: 'INVALID_CONTENT_TYPE',
        message: 'Content type must be one of: blog, listicle, howto, faq',
      });
    });

    it('should reject invalid language', async () => {
      await expect(
        generateArticle({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'XX' as any,
          wordCount: 1000,
        })
      ).rejects.toMatchObject({
        code: 'INVALID_LANGUAGE',
        message: 'Language must be one of: TR, EN, DE, FR, ES, AR',
      });
    });

    it('should reject word count below minimum (800)', async () => {
      await expect(
        generateArticle({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 500,
        })
      ).rejects.toMatchObject({
        code: 'INVALID_WORD_COUNT',
        message: 'Word count must be between 800 and 2000 words',
      });
    });

    it('should reject word count above maximum (2000)', async () => {
      await expect(
        generateArticle({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 2500,
        })
      ).rejects.toMatchObject({
        code: 'INVALID_WORD_COUNT',
        message: 'Word count must be between 800 and 2000 words',
      });
    });

    it('should reject missing API key', async () => {
      await expect(
        generateArticle({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
        })
      ).rejects.toMatchObject({
        code: 'MISSING_API_KEY',
        message: 'OpenAI API key not configured',
      });
    });
  });

  describe('Valid Input Parameters', () => {
    it('should accept all content types without throwing validation errors', async () => {
      const types = ['blog', 'listicle', 'howto', 'faq'] as const;
      
      for (const type of types) {
        await expect(
          generateArticle({
            topic: 'Valid Test Topic',
            contentType: type,
            language: 'EN',
            wordCount: 1000,
          })
        ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
      }
    });

    it('should accept all supported languages without throwing validation errors', async () => {
      const languages = ['TR', 'EN', 'DE', 'FR', 'ES', 'AR'] as const;
      
      for (const lang of languages) {
        await expect(
          generateArticle({
            topic: 'Valid Test Topic',
            contentType: 'blog',
            language: lang,
            wordCount: 1000,
          })
        ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
      }
    });

    it('should accept boundary word counts (800 and 2000)', async () => {
      await expect(
        generateArticle({
          topic: 'Valid Test',
          contentType: 'blog',
          language: 'EN',
          wordCount: 800,
        })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });

      await expect(
        generateArticle({
          topic: 'Valid Test',
          contentType: 'blog',
          language: 'EN',
          wordCount: 2000,
        })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    });
  });
});
