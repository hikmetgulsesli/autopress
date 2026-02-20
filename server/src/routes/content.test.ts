import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import contentRoutes from './content';
import { config } from '../config';

// Mock the content service
vi.mock('../services/content.service', () => ({
  generateArticle: vi.fn(),
}));

import { generateArticle } from '../services/content.service';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/content', contentRoutes);
  return app;
}

// Generate test token
function generateTestToken() {
  return jwt.sign(
    { id: 1, email: 'test@example.com', role: 'user' },
    config.JWT_SECRET
  );
}

describe('Content Routes', () => {
  let app: express.Application;
  let authToken: string;

  beforeEach(() => {
    app = createTestApp();
    authToken = generateTestToken();
    vi.clearAllMocks();
  });

  describe('POST /api/content/generate', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/content/generate')
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 with invalid request body', async () => {
      const response = await request(app)
        .post('/api/content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: '', // Empty topic
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with invalid content type', async () => {
      const response = await request(app)
        .post('/api/content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test Topic',
          contentType: 'invalid_type',
          language: 'EN',
          wordCount: 1000,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with word count below minimum', async () => {
      const response = await request(app)
        .post('/api/content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 500, // Below minimum
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with word count above maximum', async () => {
      const response = await request(app)
        .post('/api/content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 2500, // Above maximum
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should generate content successfully', async () => {
      const mockGeneratedContent = {
        title: 'Test Generated Title',
        slug: 'test-generated-title',
        excerpt: 'Test excerpt',
        metaDescription: 'Test meta description',
        content: '# Test Content\n\nThis is test content.',
        headings: {
          h1: 'Test Generated Title',
          h2: ['Section 1', 'Section 2'],
          h3: ['Subsection 1'],
        },
      };

      vi.mocked(generateArticle).mockResolvedValueOnce(mockGeneratedContent);

      const response = await request(app)
        .post('/api/content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
          keywords: ['test', 'content'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockGeneratedContent);
      expect(generateArticle).toHaveBeenCalledWith({
        topic: 'Test Topic',
        contentType: 'blog',
        language: 'EN',
        wordCount: 1000,
        keywords: ['test', 'content'],
      });
    });

    it('should return 503 when AI service is not configured', async () => {
      vi.mocked(generateArticle).mockRejectedValueOnce({
        code: 'MISSING_API_KEY',
        message: 'OpenAI API key not configured',
      });

      const response = await request(app)
        .post('/api/content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
        });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should return 429 when rate limited', async () => {
      vi.mocked(generateArticle).mockRejectedValueOnce({
        code: 'RATE_LIMITED',
        message: 'OpenAI API rate limit exceeded',
      });

      const response = await request(app)
        .post('/api/content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          wordCount: 1000,
        });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMITED');
    });

    it('should use default values when optional fields not provided', async () => {
      const mockGeneratedContent = {
        title: 'Test Title',
        slug: 'test-title',
        excerpt: 'Test excerpt',
        metaDescription: 'Test meta',
        content: 'Test content',
        headings: { h1: 'Test Title', h2: [], h3: [] },
      };

      vi.mocked(generateArticle).mockResolvedValueOnce(mockGeneratedContent);

      const response = await request(app)
        .post('/api/content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
        });

      expect(response.status).toBe(200);
      expect(generateArticle).toHaveBeenCalledWith({
        topic: 'Test Topic',
        contentType: 'blog',
        language: 'TR', // Default
        wordCount: 1000, // Default
        keywords: undefined,
      });
    });
  });

  describe('POST /api/content/suggest-title', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/content/suggest-title')
        .send({
          topic: 'Test Topic',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 with empty topic', async () => {
      const response = await request(app)
        .post('/api/content/suggest-title')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return title suggestions successfully', async () => {
      const mockGeneratedContent = {
        title: 'Original Generated Title',
        slug: 'original-generated-title',
        excerpt: 'Test excerpt',
        metaDescription: 'Test meta',
        content: 'Test content',
        headings: { h1: 'Original Generated Title', h2: [], h3: [] },
      };

      vi.mocked(generateArticle).mockResolvedValueOnce(mockGeneratedContent);

      const response = await request(app)
        .post('/api/content/suggest-title')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'EN',
          count: 3,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.topic).toBe('Test Topic');
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.suggestions.length).toBeLessThanOrEqual(3);
      
      // Check suggestion structure
      const firstSuggestion = response.body.data.suggestions[0];
      expect(firstSuggestion).toHaveProperty('id');
      expect(firstSuggestion).toHaveProperty('title');
      expect(firstSuggestion).toHaveProperty('slug');
    });

    it('should use default count of 5', async () => {
      const mockGeneratedContent = {
        title: 'Test Title',
        slug: 'test-title',
        excerpt: 'Test excerpt',
        metaDescription: 'Test meta',
        content: 'Test content',
        headings: { h1: 'Test Title', h2: [], h3: [] },
      };

      vi.mocked(generateArticle).mockResolvedValueOnce(mockGeneratedContent);

      const response = await request(app)
        .post('/api/content/suggest-title')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test Topic',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should return 503 when AI service is not configured', async () => {
      vi.mocked(generateArticle).mockRejectedValueOnce({
        code: 'MISSING_API_KEY',
        message: 'OpenAI API key not configured',
      });

      const response = await request(app)
        .post('/api/content/suggest-title')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test Topic',
        });

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('POST /api/content/analyze-seo', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .send({
          title: 'Test Title',
          content: 'Test content here',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 with empty title', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          content: 'Test content',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with empty content', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Title',
          content: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should analyze SEO successfully', async () => {
      const content = `# Test Article

This is a comprehensive test article with enough words to pass the minimum requirements.
It contains multiple paragraphs and sections to simulate real content.

## Section 1

Here is some content for section one. We need to make sure we have at least eight hundred words in this article to get a good SEO score.

## Section 2

More content here. This section also needs substantial text to be meaningful.

### Subsection

Even more detailed content goes here.

![Test Image](https://example.com/image.jpg)

[Link to resource](https://example.com)
[Another link](https://example2.com)
`;

      const response = await request(app)
        .post('/api/content/analyze-seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test SEO Analysis Title',
          content: content,
          keywords: ['test', 'seo', 'analysis'],
          language: 'EN',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('score');
      expect(response.body.data).toHaveProperty('grade');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('scores');
      expect(response.body.data).toHaveProperty('keywordAnalysis');
      expect(response.body.data).toHaveProperty('suggestions');
      
      // Check score range
      expect(response.body.data.score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.score).toBeLessThanOrEqual(100);
      
      // Check grade is valid
      expect(['A', 'B', 'C', 'D', 'F']).toContain(response.body.data.grade);
      
      // Check metrics structure
      expect(response.body.data.metrics).toHaveProperty('wordCount');
      expect(response.body.data.metrics).toHaveProperty('titleLength');
      expect(response.body.data.metrics).toHaveProperty('readingTime');
      expect(response.body.data.metrics).toHaveProperty('headingCount');
      expect(response.body.data.metrics).toHaveProperty('imageCount');
      expect(response.body.data.metrics).toHaveProperty('linkCount');
    });

    it('should analyze without keywords', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Title',
          content: 'Test content with enough words to pass validation and make the test work properly. '.repeat(20),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.keywordAnalysis).toEqual([]);
    });

    it('should provide suggestions for poor SEO content', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Short', // Very short title
          content: 'Short content.', // Very short content
          keywords: ['missing'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);
      
      // Should have suggestions about short title
      const hasTitleSuggestion = response.body.data.suggestions.some((s: string) => 
        s.toLowerCase().includes('başlık')
      );
      expect(hasTitleSuggestion).toBe(true);
    });

    it('should use default language TR', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Başlık',
          content: 'Test içerik. '.repeat(100),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('SEO Analysis Scoring', () => {
    it('should give high score for well-optimized content', async () => {
      const goodContent = `# Excellent SEO Article Title

This is a comprehensive and well-optimized article that follows all the best practices for SEO.
It has a proper structure with headings, sufficient word count, and good keyword usage.

## Introduction

The introduction provides context and engages the reader while naturally incorporating keywords.

## Main Content Section

This section contains detailed information with multiple paragraphs.
Each paragraph adds value and maintains reader engagement.

### Subsection One

Detailed content here with proper formatting.

### Subsection Two

More valuable content that supports the main topic.

## Another Main Section

Additional content to ensure we meet the word count requirements.
This helps demonstrate a well-structured article.

## Conclusion

Wrapping up with a summary of key points.

![Relevant Image](https://example.com/image1.jpg)
![Another Image](https://example.com/image2.jpg)

[External Resource](https://example.com/resource)
[Another Resource](https://example.com/resource2)
`;

      const response = await request(app)
        .post('/api/content/analyze-seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Well-Optimized SEO Article Title for Better Rankings',
          content: goodContent.repeat(5), // Repeat to ensure good word count
          keywords: ['SEO', 'article', 'content'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.score).toBeGreaterThanOrEqual(60);
      expect(['A', 'B', 'C']).toContain(response.body.data.grade);
    });

    it('should give low score for poorly optimized content', async () => {
      const response = await request(app)
        .post('/api/content/analyze-seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'X', // Very short title
          content: 'Bad.', // Very short content
        });

      expect(response.status).toBe(200);
      expect(response.body.data.score).toBeLessThan(70);
      expect(['D', 'F']).toContain(response.body.data.grade);
    });
  });
});
