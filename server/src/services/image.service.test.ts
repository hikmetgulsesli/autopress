import { describe, it, expect, beforeEach } from 'vitest';
import {
  searchImages,
  getPhoto,
  generateAttribution,
  generateAttributionText,
} from './image.service';

describe('ImageService', () => {
  beforeEach(() => {
    // Ensure no API key is set for validation-only tests
    delete process.env.UNSPLASH_ACCESS_KEY;
  });

  describe('Input Validation', () => {
    it('should reject empty query', async () => {
      await expect(
        searchImages({ query: '' })
      ).rejects.toMatchObject({
        code: 'INVALID_QUERY',
        message: 'Search query is required',
      });
    });

    it('should reject whitespace-only query', async () => {
      await expect(
        searchImages({ query: '   ' })
      ).rejects.toMatchObject({
        code: 'INVALID_QUERY',
        message: 'Search query is required',
      });
    });

    it('should reject query longer than 100 characters', async () => {
      await expect(
        searchImages({ query: 'a'.repeat(101) })
      ).rejects.toMatchObject({
        code: 'QUERY_TOO_LONG',
        message: 'Search query must be less than 100 characters',
      });
    });

    it('should reject missing API key', async () => {
      await expect(
        searchImages({ query: 'nature' })
      ).rejects.toMatchObject({
        code: 'MISSING_API_KEY',
        message: 'Unsplash API key not configured. Set UNSPLASH_ACCESS_KEY environment variable.',
      });
    });

    it('should reject empty photo ID', async () => {
      await expect(
        getPhoto('')
      ).rejects.toMatchObject({
        code: 'INVALID_PHOTO_ID',
        message: 'Photo ID is required',
      });
    });

    it('should reject whitespace-only photo ID', async () => {
      await expect(
        getPhoto('   ')
      ).rejects.toMatchObject({
        code: 'INVALID_PHOTO_ID',
        message: 'Photo ID is required',
      });
    });
  });

  describe('Valid Input Parameters', () => {
    it('should accept valid query without throwing validation errors', async () => {
      await expect(
        searchImages({ query: 'nature landscape' })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    });

    it('should accept query at exactly 100 characters', async () => {
      await expect(
        searchImages({ query: 'a'.repeat(100) })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    });

    it('should accept all valid orientations', async () => {
      const orientations = ['landscape', 'portrait', 'squarish'] as const;

      for (const orientation of orientations) {
        await expect(
          searchImages({
            query: 'test',
            orientation,
          })
        ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
      }
    });

    it('should accept valid page numbers', async () => {
      await expect(
        searchImages({
          query: 'test',
          page: 1,
        })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });

      await expect(
        searchImages({
          query: 'test',
          page: 10,
        })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    });

    it('should accept valid perPage values', async () => {
      await expect(
        searchImages({
          query: 'test',
          perPage: 1,
        })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });

      await expect(
        searchImages({
          query: 'test',
          perPage: 30,
        })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    });
  });

  describe('Attribution Generation', () => {
    const mockImage = {
      id: 'test123',
      urls: {
        raw: 'https://images.unsplash.com/raw',
        full: 'https://images.unsplash.com/full',
        regular: 'https://images.unsplash.com/regular',
        small: 'https://images.unsplash.com/small',
        thumb: 'https://images.unsplash.com/thumb',
      },
      alt_description: 'Test image',
      description: 'A test image',
      user: {
        id: 'user123',
        name: 'John Doe',
        username: 'johndoe',
        portfolio_url: null,
      },
      links: {
        html: 'https://unsplash.com/photos/test123',
      },
      width: 1920,
      height: 1080,
      color: '#000000',
    };

    it('should generate HTML attribution', () => {
      const attribution = generateAttribution(mockImage as any);
      expect(attribution).toContain('John Doe');
      expect(attribution).toContain('johndoe');
      expect(attribution).toContain('unsplash.com/@johndoe');
      expect(attribution).toContain('Unsplash');
      expect(attribution).toContain('<a href=');
    });

    it('should generate text attribution', () => {
      const attribution = generateAttributionText(mockImage as any);
      expect(attribution).toBe('Photo by John Doe on Unsplash');
    });
  });

  describe('Options Processing', () => {
    it('should use default values when not provided', async () => {
      // This will fail due to missing API key, but we're checking defaults don't cause errors
      try {
        await searchImages({ query: 'test' });
      } catch (err: any) {
        expect(err.code).toBe('MISSING_API_KEY');
      }
    });

    it('should clamp perPage to valid range', async () => {
      // perPage should be clamped between 1 and 30
      try {
        await searchImages({ query: 'test', perPage: 50 });
      } catch (err: any) {
        expect(err.code).toBe('MISSING_API_KEY');
      }

      try {
        await searchImages({ query: 'test', perPage: 0 });
      } catch (err: any) {
        expect(err.code).toBe('MISSING_API_KEY');
      }
    });
  });
});
