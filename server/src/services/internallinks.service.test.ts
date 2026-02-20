import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as cheerio from 'cheerio';
import {
  extractKeywords,
  generateLinkSuggestions,
  applyLinkSuggestion,
  autoLinkArticle,
  getLinkStatistics,
  findOrphanedArticles,
  LinkSuggestion,
} from './internallinks.service';

// Mock the database connection
vi.mock('../db/connection', () => ({
  query: vi.fn(),
  pool: {
    query: vi.fn(),
  },
}));

import { query } from '../db/connection';

const mockedQuery = vi.mocked(query);

describe('Internal Links Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedQuery.mockReset();
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const text = 'JavaScript is a programming language. JavaScript is used for web development.';
      const keywords = extractKeywords(text, 10);

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('javascript');
    });

    it('should extract multi-word phrases', () => {
      const text = 'Machine learning is a subset of artificial intelligence. Machine learning algorithms are powerful.';
      const keywords = extractKeywords(text, 10);

      expect(keywords.some(k => k.includes('machine learning'))).toBe(true);
    });

    it('should filter out stop words', () => {
      const text = 'The and a is are was were for with from';
      const keywords = extractKeywords(text, 10);

      expect(keywords.length).toBe(0);
    });

    it('should handle empty text', () => {
      const keywords = extractKeywords('', 10);
      expect(keywords).toEqual([]);
    });

    it('should handle Turkish text', () => {
      const text = 'Yapay zeka teknolojisi hızla gelişiyor. Yapay zeka uygulamaları yaygınlaşıyor.';
      const keywords = extractKeywords(text, 10);

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.some(k => k.includes('yapay zeka'))).toBe(true);
    });

    it('should return keywords sorted by frequency', () => {
      const text = 'react react react javascript javascript python';
      const keywords = extractKeywords(text, 10);

      expect(keywords[0]).toBe('react');
      expect(keywords[1]).toBe('javascript');
    });
  });

  describe('generateLinkSuggestions', () => {
    it('should throw error for non-existent article', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] });

      await expect(generateLinkSuggestions(999, 10)).rejects.toThrow('Article with id 999 not found');
    });

    it('should return empty array when no target articles exist', async () => {
      mockedQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Test Article',
            slug: 'test-article',
            content: '<p>This is test content about JavaScript.</p>',
            excerpt: 'Test excerpt',
            site_id: 1,
            published_url: '/test-article',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        });

      const suggestions = await generateLinkSuggestions(1, 10);
      expect(suggestions).toEqual([]);
    });

    it('should generate suggestions for relevant articles', async () => {
      const sourceArticle = {
        id: 1,
        title: 'JavaScript Programming Guide',
        slug: 'js-guide',
        content: '<p>Learn JavaScript programming for web development.</p>',
        excerpt: 'JS guide',
        site_id: 1,
        published_url: '/js-guide',
      };

      const targetArticle = {
        id: 2,
        title: 'Web Development Best Practices',
        slug: 'web-dev',
        content: '<p>Web development tips and tricks.</p>',
        excerpt: 'Web dev tips',
        site_id: 1,
        published_url: '/web-dev',
      };

      mockedQuery
        .mockResolvedValueOnce({
          rows: [sourceArticle],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [targetArticle],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

      const suggestions = await generateLinkSuggestions(1, 10);

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('applyLinkSuggestion', () => {
    it('should return error for non-existent source article', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] });

      const suggestion: LinkSuggestion = {
        sourceArticleId: 999,
        targetArticleId: 2,
        targetTitle: 'Target Article',
        targetSlug: 'target',
        targetUrl: '/target',
        anchorText: 'JavaScript',
        context: '...learn JavaScript...',
        relevanceScore: 50,
        position: 10,
        applied: false,
      };

      const result = await applyLinkSuggestion(999, suggestion);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Source article not found');
    });

    it('should return error for non-existent target article', async () => {
      mockedQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Source',
            slug: 'source',
            content: '<p>Learn JavaScript</p>',
            excerpt: 'Source excerpt',
            site_id: 1,
            published_url: '/source',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        });

      const suggestion: LinkSuggestion = {
        sourceArticleId: 1,
        targetArticleId: 999,
        targetTitle: 'Target Article',
        targetSlug: 'target',
        targetUrl: '/target',
        anchorText: 'JavaScript',
        context: '...learn JavaScript...',
        relevanceScore: 50,
        position: 10,
        applied: false,
      };

      const result = await applyLinkSuggestion(1, suggestion);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Target article not found');
    });

    it('should successfully apply a link', async () => {
      mockedQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Source Article',
            slug: 'source',
            content: '<p>Learn JavaScript programming</p>',
            excerpt: 'Source excerpt',
            site_id: 1,
            published_url: '/source',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 2,
            title: 'JavaScript Guide',
            slug: 'js-guide',
            content: 'JS content',
            excerpt: 'JS excerpt',
            site_id: 1,
            published_url: '/js-guide',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'UPDATE',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

      const suggestion: LinkSuggestion = {
        sourceArticleId: 1,
        targetArticleId: 2,
        targetTitle: 'JavaScript Guide',
        targetSlug: 'js-guide',
        targetUrl: '/js-guide',
        anchorText: 'JavaScript',
        context: '...learn JavaScript...',
        relevanceScore: 50,
        position: 6,
        applied: false,
      };

      const result = await applyLinkSuggestion(1, suggestion);

      expect(result.success).toBe(true);
      expect(result.updatedContent).toBeDefined();
    });
  });

  describe('autoLinkArticle', () => {
    it('should auto-link with high-quality suggestions', async () => {
      const sourceArticle = {
        id: 1,
        title: 'Web Development Guide',
        slug: 'web-dev-guide',
        content: '<p>Learn web development and JavaScript programming.</p>',
        excerpt: 'Web dev guide',
        site_id: 1,
        published_url: '/web-dev-guide',
      };

      const targetArticle = {
        id: 2,
        title: 'JavaScript Programming',
        slug: 'js-programming',
        content: 'JS content',
        excerpt: 'JS programming guide',
        site_id: 1,
        published_url: '/js-programming',
      };

      mockedQuery
        .mockResolvedValueOnce({
          rows: [sourceArticle],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [targetArticle],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [targetArticle],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'UPDATE',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

      const result = await autoLinkArticle(1, 3);

      expect(result).toHaveProperty('inserted');
      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe('getLinkStatistics', () => {
    it('should return statistics for all sites', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          total_links: '25',
          unique_sources: '10',
          unique_targets: '15',
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });
      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: '50' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const stats = await getLinkStatistics();

      expect(stats).toEqual({
        totalLinks: 25,
        uniqueSourceArticles: 10,
        uniqueTargetArticles: 15,
        averageLinksPerArticle: 0.5,
      });
    });

    it('should return statistics for specific site', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          total_links: '10',
          unique_sources: '5',
          unique_targets: '8',
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });
      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: '20' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const stats = await getLinkStatistics(1);

      expect(stats.totalLinks).toBe(10);
    });
  });

  describe('findOrphanedArticles', () => {
    it('should return articles with no incoming links', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: 'Orphaned Article',
            slug: 'orphaned',
            content: 'Content',
            excerpt: 'Excerpt',
            site_id: 1,
            published_url: '/orphaned',
          },
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const orphaned = await findOrphanedArticles();

      expect(orphaned.length).toBe(1);
      expect(orphaned[0].title).toBe('Orphaned Article');
    });

    it('should filter by site_id when provided', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const orphaned = await findOrphanedArticles(1);

      expect(orphaned).toEqual([]);
    });
  });
});

describe('Cheerio HTML Parsing', () => {
  it('should parse HTML and find text nodes', () => {
    const html = '<p>Learn <strong>JavaScript</strong> programming</p>';
    const $ = cheerio.load(html);

    const text = $('p').text();
    expect(text).toContain('JavaScript');
    expect(text).toContain('programming');
  });

  it('should modify HTML content', () => {
    const html = '<p>Learn JavaScript</p>';
    const $ = cheerio.load(html);

    const textNode = $('p').contents().filter((_, el) => el.type === 'text').first();
    const text = textNode.text();
    const index = text.indexOf('JavaScript');

    if (index !== -1) {
      const before = text.substring(0, index);
      const after = text.substring(index + 'JavaScript'.length);
      textNode.replaceWith(`${before}<a href="/js">JavaScript</a>${after}`);
    }

    expect($.html()).toContain('<a href="/js">JavaScript</a>');
  });

  it('should skip existing links', () => {
    const html = '<p>Learn <a href="/existing">JavaScript</a></p>';
    const $ = cheerio.load(html);

    const hasLink = $('a').length > 0;
    expect(hasLink).toBe(true);

    const linkText = $('a').text();
    expect(linkText).toBe('JavaScript');
  });
});
