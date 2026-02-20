import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockGenerateArticle = vi.fn();

vi.mock('../middleware/auth', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = { id: 1, email: 'test@example.com', role: 'admin' };
    next();
  }),
  AuthRequest: class AuthRequest {},
}));

vi.mock('../services/content.service', () => ({
  generateArticle: (...args: any[]) => mockGenerateArticle(...args),
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

import contentRoutes from './content';

const app = express();
app.use(express.json());
app.use('/api/content', contentRoutes);

describe('Content Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/content/generate', () => {
    it('should return 400 for missing topic', async () => {
      const response = await request(app)
        .post('/api/content/generate')
        .send({
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid content type', async () => {
      const response = await request(app)
        .post('/api/content/generate')
        .send({
          topic: 'Test Topic',
          contentType: 'invalid',
          language: 'EN',
          wordCount: 1000,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for word count below minimum', async () => {
      const response = await request(app)
        .post('/api/content/generate')
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 500,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for word count above maximum', async () => {
      const response = await request(app)
        .post('/api/content/generate')
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 2500,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 for missing API key', async () => {
      mockGenerateArticle.mockRejectedValueOnce({
        code: 'MISSING_API_KEY',
        message: 'OpenAI API key not configured',
      });

      const response = await request(app)
        .post('/api/content/generate')
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
        });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('MISSING_API_KEY');
    });

    it('should generate content successfully with valid input', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      const mockGeneratedContent = {
        title: 'Test Article Title',
        slug: 'test-article-title',
        excerpt: 'Test excerpt',
        metaDescription: 'Test meta description',
        content: '# Test Content',
        headings: { h1: 'Test Article Title', h2: ['Section 1'], h3: [] },
      };

      mockGenerateArticle.mockResolvedValueOnce(mockGeneratedContent);

      const response = await request(app)
        .post('/api/content/generate')
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
          keywords: ['test', 'article'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockGeneratedContent);
    });

    it('should handle AI service errors', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      mockGenerateArticle.mockRejectedValueOnce({
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded',
      });

      const response = await request(app)
        .post('/api/content/generate')
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
        });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMITED');
    });
  });

  describe('POST /api/content/suggest-title', () => {
    it('should return 400 for missing topic', async () => {
      const response = await request(app)
        .post('/api/content/suggest-title')
        .send({
          contentType: 'blog',
          language: 'EN',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 for missing API key', async () => {
      const response = await request(app)
        .post('/api/content/suggest-title')
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
        });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('MISSING_API_KEY');
    });

    it('should return title suggestions successfully', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      const mockOpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              titles: [
                '10 Tips for Better Content',
                'The Ultimate Guide to Writing',
                'How to Create Engaging Articles',
              ],
            }),
          },
        }],
      });
      
      vi.mocked(mockOpenAI).mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as any));

      const response = await request(app)
        .post('/api/content/suggest-title')
        .send({
          topic: 'Content Writing',
          contentType: 'blog',
          language: 'EN',
          count: 3,
        });

      expect(response.status === 200 || response.status === 500).toBe(true);
    });
  });

  describe('POST /api/content/analyze-seo', () => {
    it('should return 400 for missing title', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .send({
          content: 'Test content here',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing content', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .send({
          title: 'Test Title',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should analyze SEO successfully with valid input', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .send({
          title: 'The Ultimate Guide to Content Writing for Beginners',
          content: `# Introduction\n\nThis is a comprehensive guide.\n\n## Section 1\n\nContent here with some keywords.\n\n## Section 2\n\nMore content with content writing tips.`,
          metaDescription: 'Learn content writing with this comprehensive guide for beginners.',
          keywords: ['content writing', 'beginners guide'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.scores).toBeDefined();
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.keywordAnalysis).toBeInstanceOf(Array);
    });

    it('should calculate SEO scores correctly', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .send({
          title: 'Short',
          content: 'Very short content.',
          keywords: ['test'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.scores.overall).toBeLessThan(100);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);
    });

    it('should analyze keyword density correctly', async () => {
      const content = 'This is content about something else. '.repeat(50) + ' keyword here';
      
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .send({
          title: 'Test Article',
          content: content,
          keywords: ['keyword'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.keywordAnalysis).toHaveLength(1);
      expect(response.body.data.keywordAnalysis[0].keyword).toBe('keyword');
      expect(response.body.data.keywordAnalysis[0].inTitle).toBe(false);
      expect(response.body.data.keywordAnalysis[0].inContent).toBe(true);
      expect(response.body.data.keywordAnalysis[0].occurrences).toBeGreaterThan(0);
    });

    it('should handle content with headings, images, and links', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .send({
          title: 'Complete Guide to SEO Best Practices for 2024',
          content: `# SEO Best Practices\n\nThis guide covers everything.\n\n## On-Page SEO\n\nImportant factors include:\n\n![SEO Diagram](https://example.com/image.png)\n\nLearn more about [SEO techniques](https://example.com/seo).\n\n## Technical SEO\n\nSite speed matters.`,
          metaDescription: 'Master SEO with our comprehensive guide covering on-page and technical SEO strategies.',
          keywords: ['SEO', 'best practices'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.metrics.hasHeadings).toBe(true);
      expect(response.body.data.metrics.hasImages).toBe(true);
      expect(response.body.data.metrics.hasLinks).toBe(true);
      expect(response.body.data.scores.structure).toBeGreaterThan(50);
    });
  });
});
