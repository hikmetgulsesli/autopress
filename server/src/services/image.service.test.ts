import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchImages, getRandomImage, generateAttribution, generateAttributionMarkdown } from './image.service';

describe('ImageService', () => {
  beforeEach(() => {
    delete process.env.UNSPLASH_ACCESS_KEY;
    vi.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject empty query', async () => {
      await expect(searchImages('')).rejects.toMatchObject({
        code: 'INVALID_QUERY',
        message: 'Search query is required',
      });
    });

    it('should reject whitespace-only query', async () => {
      await expect(searchImages('   ')).rejects.toMatchObject({
        code: 'INVALID_QUERY',
        message: 'Search query is required',
      });
    });

    it('should reject page less than 1', async () => {
      await expect(searchImages('nature', 0)).rejects.toMatchObject({
        code: 'INVALID_PAGE',
        message: 'Page must be at least 1',
      });
    });

    it('should reject negative page', async () => {
      await expect(searchImages('nature', -1)).rejects.toMatchObject({
        code: 'INVALID_PAGE',
        message: 'Page must be at least 1',
      });
    });

    it('should reject per_page less than 1', async () => {
      await expect(searchImages('nature', 1, 0)).rejects.toMatchObject({
        code: 'INVALID_PER_PAGE',
        message: 'Per page must be between 1 and 30',
      });
    });

    it('should reject per_page greater than 30', async () => {
      await expect(searchImages('nature', 1, 31)).rejects.toMatchObject({
        code: 'INVALID_PER_PAGE',
        message: 'Per page must be between 1 and 30',
      });
    });

    it('should reject missing API key', async () => {
      await expect(searchImages('nature')).rejects.toMatchObject({
        code: 'MISSING_API_KEY',
        message: 'Unsplash API key not configured. Please set UNSPLASH_ACCESS_KEY environment variable.',
      });
    });

    it('should reject missing API key for random image', async () => {
      await expect(getRandomImage()).rejects.toMatchObject({
        code: 'MISSING_API_KEY',
        message: 'Unsplash API key not configured. Please set UNSPLASH_ACCESS_KEY environment variable.',
      });
    });
  });

  describe('Valid Input Parameters', () => {
    it('should accept valid query with default pagination', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'test-key';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [],
          total: 0,
          total_pages: 0,
        }),
      });

      const result = await searchImages('nature');
      expect(result.page).toBe(1);
      expect(result.results).toEqual([]);
    });

    it('should accept valid query with custom pagination', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'test-key';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [],
          total: 0,
          total_pages: 0,
        }),
      });

      const result = await searchImages('nature', 2, 20);
      expect(result.page).toBe(2);
    });

    it('should accept boundary per_page values (1 and 30)', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'test-key';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [],
          total: 0,
          total_pages: 0,
        }),
      });

      await expect(searchImages('nature', 1, 1)).resolves.toBeDefined();
      await expect(searchImages('nature', 1, 30)).resolves.toBeDefined();
    });
  });

  describe('API Response Handling', () => {
    it('should map Unsplash photo response correctly', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'test-key';
      
      const mockPhoto = {
        id: 'test123',
        urls: {
          regular: 'https://images.unsplash.com/regular.jpg',
          small: 'https://images.unsplash.com/small.jpg',
        },
        description: 'A beautiful nature photo',
        alt_description: 'Nature landscape',
        width: 1920,
        height: 1080,
        color: '#0f172a',
        user: {
          name: 'John Doe',
          username: 'johndoe',
          links: {
            html: 'https://unsplash.com/@johndoe',
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [mockPhoto],
          total: 1,
          total_pages: 1,
        }),
      });

      const result = await searchImages('nature');
      expect(result.results).toHaveLength(1);
      
      const image = result.results[0];
      expect(image.id).toBe('test123');
      expect(image.url).toBe('https://images.unsplash.com/regular.jpg');
      expect(image.thumbUrl).toBe('https://images.unsplash.com/small.jpg');
      expect(image.description).toBe('A beautiful nature photo');
      expect(image.altDescription).toBe('Nature landscape');
      expect(image.width).toBe(1920);
      expect(image.height).toBe(1080);
      expect(image.color).toBe('#0f172a');
      expect(image.photographer.name).toBe('John Doe');
      expect(image.photographer.username).toBe('johndoe');
      expect(image.photographer.portfolioUrl).toBe('https://unsplash.com/@johndoe');
    });

    it('should handle null description fields', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'test-key';
      
      const mockPhoto = {
        id: 'test456',
        urls: {
          regular: 'https://images.unsplash.com/regular.jpg',
          small: 'https://images.unsplash.com/small.jpg',
        },
        description: null,
        alt_description: null,
        width: 800,
        height: 600,
        color: null,
        user: {
          name: 'Jane Doe',
          username: 'janedoe',
          links: {
            html: 'https://unsplash.com/@janedoe',
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [mockPhoto],
          total: 1,
          total_pages: 1,
        }),
      });

      const result = await searchImages('nature');
      expect(result.results[0].description).toBeNull();
      expect(result.results[0].altDescription).toBeNull();
      expect(result.results[0].color).toBeNull();
    });

    it('should handle 401 auth error', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'invalid-key';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ errors: ['Invalid credentials'] }),
      });

      await expect(searchImages('nature')).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        message: 'Invalid Unsplash API key',
      });
    });

    it('should handle 403 rate limit error', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'test-key';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ errors: ['Rate limit exceeded'] }),
      });

      await expect(searchImages('nature')).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        message: 'Unsplash API rate limit exceeded. Free tier allows 50 requests/hour.',
      });
    });

    it('should handle network errors', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'test-key';
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(searchImages('nature')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to Unsplash API: Network error',
      });
    });
  });

  describe('Attribution Generation', () => {
    const mockImage = {
      id: 'test123',
      url: 'https://example.com/image.jpg',
      thumbUrl: 'https://example.com/thumb.jpg',
      description: null,
      altDescription: null,
      width: 100,
      height: 100,
      photographer: {
        name: 'John Doe',
        username: 'johndoe',
        portfolioUrl: 'https://unsplash.com/@johndoe',
      },
      color: null,
    };

    it('should generate HTML attribution', () => {
      const attribution = generateAttribution(mockImage);
      expect(attribution).toContain('John Doe');
      expect(attribution).toContain('https://unsplash.com/@johndoe');
      expect(attribution).toContain('Unsplash');
      expect(attribution).toContain('<a href=');
    });

    it('should generate markdown attribution', () => {
      const attribution = generateAttributionMarkdown(mockImage);
      expect(attribution).toContain('[John Doe]');
      expect(attribution).toContain('https://unsplash.com/@johndoe');
      expect(attribution).toContain('[Unsplash]');
    });
  });
});
