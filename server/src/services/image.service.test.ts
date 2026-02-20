import { describe, it, expect, beforeEach } from 'vitest';
import { searchImages } from '../services/image.service';

describe('ImageService', () => {
  beforeEach(() => { delete process.env.PEXELS_API_KEY; });

  it('should reject empty query', async () => {
    await expect(searchImages({ query: '' })).rejects.toMatchObject({ code: 'INVALID_QUERY' });
  });

  it('should reject page < 1', async () => {
    await expect(searchImages({ query: 'nature', page: 0 })).rejects.toMatchObject({ code: 'INVALID_PAGE' });
  });

  it('should reject perPage < 1', async () => {
    await expect(searchImages({ query: 'nature', perPage: 0 })).rejects.toMatchObject({ code: 'INVALID_PER_PAGE' });
  });

  it('should reject perPage > 80', async () => {
    await expect(searchImages({ query: 'nature', perPage: 81 })).rejects.toMatchObject({ code: 'INVALID_PER_PAGE' });
  });

  it('should reject missing API key', async () => {
    await expect(searchImages({ query: 'nature' })).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
  });
});
