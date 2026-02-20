import { describe, it, expect, beforeEach } from 'vitest';
import { searchImages } from '../services/image.service';

describe('ImageService', () => {
  beforeEach(() => {
    delete process.env.PEXELS_API_KEY;
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

    it('should reject page less than 1', async () => {
      await expect(
        searchImages({ query: 'nature', page: 0 })
      ).rejects.toMatchObject({
        code: 'INVALID_PAGE',
        message: 'Page must be greater than 0',
      });
    });

    it('should reject negative page', async () => {
      await expect(
        searchImages({ query: 'nature', page: -1 })
      ).rejects.toMatchObject({
        code: 'INVALID_PAGE',
        message: 'Page must be greater than 0',
      });
    });

    it('should reject perPage less than 1', async () => {
      await expect(
        searchImages({ query: 'nature', perPage: 0 })
      ).rejects.toMatchObject({
        code: 'INVALID_PER_PAGE',
        message: 'Per page must be between 1 and 80',
      });
    });

    it('should reject perPage greater than 80', async () => {
      await expect(
        searchImages({ query: 'nature', perPage: 81 })
      ).rejects.toMatchObject({
        code: 'INVALID_PER_PAGE',
        message: 'Per page must be between 1 and 80',
      });
    });

    it('should reject missing API key', async () => {
      await expect(
        searchImages({ query: 'nature' })
      ).rejects.toMatchObject({
        code: 'MISSING_API_KEY',
        message: 'Pexels API key not configured',
      });
    });
  });

  describe('Valid Input Parameters', () => {
    it('should accept valid query without throwing validation errors', async () => {
      await expect(
        searchImages({ query: 'nature' })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    });

    it('should accept page 1', async () => {
      await expect(
        searchImages({ query: 'nature', page: 1 })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    });

    it('should accept perPage boundary values', async () => {
      await expect(
        searchImages({ query: 'nature', perPage: 1 })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });

      await expect(
        searchImages({ query: 'nature', perPage: 80 })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    });
  });
});
