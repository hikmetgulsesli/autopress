import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeArticleSEO,
  extractLinks,
  createBulkJob,
  getBulkJob,
  updateJobProgress,
  startJob,
  completeJob,
  failJob,
  getBulkJobs,
  getArticlesForAnalysis,
  saveBrokenLink,
  clearBrokenLinks,
  getBrokenLinks,
  getLinkSuggestions,
  applyLinkSuggestion,
  deleteOldJobs,
  updateArticleSEOScore,
} from './bulkseo.service';
import { query } from '../db/connection';

// Mock the database connection
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

const mockedQuery = vi.mocked(query);

describe('BulkSEOService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeArticleSEO', () => {
    it('should detect missing meta description', async () => {
      const article = {
        id: 1,
        title: 'Test Article Title',
        slug: 'test-article',
        content: '<h1>Test</h1><p>Content here</p>',
        meta_title: 'Test Article Title',
        meta_description: '',
        seo_score: 50,
        word_count: 500,
      };

      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      const result = await analyzeArticleSEO(article);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          field: 'meta_description',
          message: expect.stringContaining('missing'),
        })
      );
    });

    it('should detect short title', async () => {
      const article = {
        id: 1,
        title: 'Short',
        slug: 'short',
        content: '<h1>Short</h1><p>Content here with many words to pass the word count check</p>',
        meta_title: 'Short',
        meta_description: 'This is a meta description that is long enough to pass the minimum length check',
        seo_score: 50,
        word_count: 500,
      };

      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      const result = await analyzeArticleSEO(article);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          field: 'title',
          message: expect.stringContaining('too short'),
        })
      );
    });

    it('should detect missing H1 heading', async () => {
      const article = {
        id: 1,
        title: 'Test Article Title That Is Long Enough',
        slug: 'test-article',
        content: '<p>Content without heading</p>',
        meta_title: 'Test Article Title',
        meta_description: 'This is a meta description that is long enough to pass',
        seo_score: 50,
        word_count: 500,
      };

      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      const result = await analyzeArticleSEO(article);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          field: 'headings',
          message: expect.stringContaining('No H1'),
        })
      );
    });

    it('should detect short content', async () => {
      const article = {
        id: 1,
        title: 'Test Article Title That Is Long Enough',
        slug: 'test-article',
        content: '<h1>Test</h1><p>Short</p>',
        meta_title: 'Test Article Title',
        meta_description: 'This is a meta description that is long enough to pass',
        seo_score: 50,
        word_count: 100,
      };

      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      const result = await analyzeArticleSEO(article);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          field: 'content',
          message: expect.stringContaining('too short'),
        })
      );
    });

    it('should pass for well-optimized article', async () => {
      const article = {
        id: 1,
        title: 'Complete Guide to SEO Best Practices',
        slug: 'seo-best-practices',
        content: '<h1>Complete Guide to SEO</h1><h2>Introduction</h2><p>' + 'word '.repeat(400) + '</p>',
        meta_title: 'Complete Guide to SEO Best Practices',
        meta_description: 'Learn the best SEO practices for 2024. This comprehensive guide covers everything you need to know.',
        seo_score: 85,
        word_count: 1000,
      };

      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      const result = await analyzeArticleSEO(article);

      expect(result.issues.filter(i => i.type === 'error')).toHaveLength(0);
    });

    it('should save SEO score to database after analysis', async () => {
      const article = {
        id: 1,
        title: 'Complete Guide to SEO Best Practices',
        slug: 'seo-best-practices',
        content: '<h1>Complete Guide to SEO</h1><h2>Introduction</h2><p>' + 'word '.repeat(400) + '</p>',
        meta_title: 'Complete Guide to SEO Best Practices',
        meta_description: 'Learn the best SEO practices for 2024. This comprehensive guide covers everything you need to know.',
        seo_score: 85,
        word_count: 1000,
      };

      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      const result = await analyzeArticleSEO(article);

      expect(mockedQuery).toHaveBeenCalledWith(
        'UPDATE articles SET seo_score = $1 WHERE id = $2',
        [expect.any(Number), 1]
      );
      expect(result.seo_score).toBeGreaterThan(0);
    });

    it('should calculate lower SEO score for articles with errors', async () => {
      const article = {
        id: 1,
        title: 'Short',
        slug: '',
        content: '<p>No headings</p>',
        meta_title: 'Short',
        meta_description: '',
        seo_score: 50,
        word_count: 100,
      };

      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      const result = await analyzeArticleSEO(article);

      // Multiple errors should result in lower score
      expect(result.seo_score).toBeLessThan(50);
      expect(mockedQuery).toHaveBeenCalledWith(
        'UPDATE articles SET seo_score = $1 WHERE id = $2',
        [expect.any(Number), 1]
      );
    });
  });

  describe('extractLinks', () => {
    it('should extract internal links', () => {
      const content = '<p>Check out <a href="/about">our about page</a> and <a href="/contact">contact us</a>.</p>';
      
      const links = extractLinks(content);

      expect(links).toHaveLength(2);
      expect(links[0]).toEqual({ url: '/about', anchorText: 'our about page', type: 'internal' });
      expect(links[1]).toEqual({ url: '/contact', anchorText: 'contact us', type: 'internal' });
    });

    it('should extract external links', () => {
      const content = '<p>Read more on <a href="https://example.com">Example</a>.</p>';
      
      const links = extractLinks(content);

      expect(links).toHaveLength(1);
      expect(links[0]).toEqual({ url: 'https://example.com', anchorText: 'Example', type: 'external' });
    });

    it('should skip anchor and javascript links', () => {
      const content = '<p><a href="#section">Jump</a> and <a href="javascript:void(0)">Click</a>.</p>';
      
      const links = extractLinks(content);

      expect(links).toHaveLength(0);
    });

    it('should handle links without anchor text', () => {
      const content = '<p><a href="/test"></a></p>';
      
      const links = extractLinks(content);

      expect(links).toHaveLength(1);
      expect(links[0].anchorText).toBe('');
    });
  });

  describe('createBulkJob', () => {
    it('should create a new bulk job', async () => {
      const mockJob = {
        id: 1,
        job_type: 'seo_analysis',
        status: 'pending',
        total_items: 0,
        processed_items: 0,
        failed_items: 0,
        filters: null,
        results: null,
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      mockedQuery.mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 } as any);

      const result = await createBulkJob('seo_analysis', { site_id: 1 });

      expect(result).toEqual(mockJob);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO bulk_seo_jobs'),
        ['seo_analysis', 'pending', expect.any(String)]
      );
    });
  });

  describe('getBulkJob', () => {
    it('should return job by id', async () => {
      const mockJob = { id: 1, job_type: 'seo_analysis', status: 'running' };
      mockedQuery.mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 } as any);

      const result = await getBulkJob(1);

      expect(result).toEqual(mockJob);
    });

    it('should return null for non-existent job', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await getBulkJob(999);

      expect(result).toBeNull();
    });
  });

  describe('updateJobProgress', () => {
    it('should update job progress', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await updateJobProgress(1, 10, 2);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bulk_seo_jobs'),
        [10, 2, 1]
      );
    });
  });

  describe('startJob', () => {
    it('should mark job as running', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await startJob(1, 100);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'running'"),
        [100, 1]
      );
    });
  });

  describe('completeJob', () => {
    it('should mark job as completed with results', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      const results = { analyzed: 100, issues: 50 };

      await completeJob(1, results);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'completed'"),
        [JSON.stringify(results), 1]
      );
    });
  });

  describe('failJob', () => {
    it('should mark job as failed with error message', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await failJob(1, 'Network error');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'failed'"),
        ['Network error', 1]
      );
    });
  });

  describe('getBulkJobs', () => {
    it('should return paginated jobs', async () => {
      const mockJobs = [
        { id: 1, job_type: 'seo_analysis' },
        { id: 2, job_type: 'link_checker' },
      ];
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockJobs, rowCount: 2 } as any);

      const result = await getBulkJobs(1, 20);

      expect(result.jobs).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getArticlesForAnalysis', () => {
    it('should return articles with filters', async () => {
      const mockArticles = [{ id: 1, title: 'Test' }];
      mockedQuery.mockResolvedValueOnce({ rows: mockArticles, rowCount: 1 } as any);

      const result = await getArticlesForAnalysis({ site_id: 1, status: 'published' });

      expect(result).toEqual(mockArticles);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1'),
        expect.arrayContaining([1, 'published'])
      );
    });

    it('should apply SEO score filters', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await getArticlesForAnalysis({ min_seo_score: 50, max_seo_score: 80 });

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('seo_score >='),
        expect.arrayContaining([50, 80])
      );
    });
  });

  describe('saveBrokenLink', () => {
    it('should save broken link', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await saveBrokenLink(1, 'https://example.com', 'external', 'Example', 404, 'Not Found');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO broken_links'),
        expect.arrayContaining([1, 'https://example.com', 'external', 'Example', 404, 'Not Found'])
      );
    });
  });

  describe('clearBrokenLinks', () => {
    it('should clear broken links for article', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await clearBrokenLinks(1);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM broken_links'),
        [1]
      );
    });
  });

  describe('getBrokenLinks', () => {
    it('should return broken links with filters', async () => {
      const mockLinks = [{ id: 1, url: 'https://broken.com' }];
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockLinks, rowCount: 1 } as any);

      const result = await getBrokenLinks(1, 50, { link_type: 'external' });

      expect(result.links).toHaveLength(1);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('link_type ='),
        expect.any(Array)
      );
    });
  });

  describe('getLinkSuggestions', () => {
    it('should return link suggestions', async () => {
      const mockSuggestions = [{ id: 1, relevance_score: 80 }];
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockSuggestions, rowCount: 1 } as any);

      const result = await getLinkSuggestions(1);

      expect(result.suggestions).toHaveLength(1);
    });
  });

  describe('applyLinkSuggestion', () => {
    it('should mark suggestion as applied', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await applyLinkSuggestion(1);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_applied = true'),
        [1]
      );
    });
  });

  describe('updateArticleSEOScore', () => {
    it('should update article SEO score with parameterized query', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await updateArticleSEOScore(1, 85);

      expect(mockedQuery).toHaveBeenCalledWith(
        'UPDATE articles SET seo_score = $1 WHERE id = $2',
        [85, 1]
      );
    });

    it('should handle zero SEO score', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await updateArticleSEOScore(1, 0);

      expect(mockedQuery).toHaveBeenCalledWith(
        'UPDATE articles SET seo_score = $1 WHERE id = $2',
        [0, 1]
      );
    });

    it('should handle maximum SEO score', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await updateArticleSEOScore(1, 100);

      expect(mockedQuery).toHaveBeenCalledWith(
        'UPDATE articles SET seo_score = $1 WHERE id = $2',
        [100, 1]
      );
    });
  });
});
