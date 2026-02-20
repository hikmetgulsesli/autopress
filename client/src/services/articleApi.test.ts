import { describe, it, expect, vi, beforeEach } from 'vitest';
import { articleApi } from './articleApi';
import api from './api';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('articleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('fetches articles without filters', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, title: 'Test Article' }],
          total: 1,
          page: 1,
          limit: 20,
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await articleApi.list();

      expect(api.get).toHaveBeenCalledWith('/articles');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('fetches articles with filters', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, title: 'Test Article', status: 'draft' }],
          total: 1,
          page: 1,
          limit: 10,
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      await articleApi.list({ status: 'draft', page: 1, limit: 10 });

      expect(api.get).toHaveBeenCalledWith('/articles?status=draft&page=1&limit=10');
    });
  });

  describe('get', () => {
    it('fetches a single article by id', async () => {
      const mockArticle = { id: 1, title: 'Test Article' };
      vi.mocked(api.get).mockResolvedValue({ data: mockArticle });

      const result = await articleApi.get(1);

      expect(api.get).toHaveBeenCalledWith('/articles/1');
      expect(result).toEqual(mockArticle);
    });
  });

  describe('create', () => {
    it('makes POST request for new articles', async () => {
      const newArticle = {
        title: 'New Article',
        content: 'Article content',
        site_id: 1,
      };
      const mockResponse = { id: 1, ...newArticle };
      vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

      const result = await articleApi.create(newArticle);

      expect(api.post).toHaveBeenCalledWith('/articles', newArticle);
      expect(result.id).toBe(1);
    });

    it('sends correct default values', async () => {
      const newArticle = {
        title: 'New Article',
        content: 'Article content',
      };
      vi.mocked(api.post).mockResolvedValue({ data: { id: 1, ...newArticle } });

      await articleApi.create(newArticle);

      expect(api.post).toHaveBeenCalledWith('/articles', newArticle);
    });
  });

  describe('update', () => {
    it('makes PUT request for existing articles', async () => {
      const updateData = {
        title: 'Updated Article',
        content: 'Updated content',
      };
      const mockResponse = { id: 1, ...updateData };
      vi.mocked(api.put).mockResolvedValue({ data: mockResponse });

      const result = await articleApi.update(1, updateData);

      expect(api.put).toHaveBeenCalledWith('/articles/1', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('delete', () => {
    it('makes DELETE request', async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: {} });

      await articleApi.delete(1);

      expect(api.delete).toHaveBeenCalledWith('/articles/1');
    });
  });

  describe('save', () => {
    it('calls create for new articles (without id)', async () => {
      const newArticle = {
        title: 'New Article',
        content: 'Content',
      };
      const mockResponse = { id: 1, ...newArticle };
      vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

      const result = await articleApi.save(newArticle);

      expect(api.post).toHaveBeenCalledWith('/articles', newArticle);
      expect(api.put).not.toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('calls update for existing articles (with id)', async () => {
      const existingArticle = {
        id: 1,
        title: 'Updated Article',
        content: 'Updated content',
      };
      const mockResponse = { ...existingArticle };
      vi.mocked(api.put).mockResolvedValue({ data: mockResponse });

      const result = await articleApi.save(existingArticle);

      expect(api.put).toHaveBeenCalledWith('/articles/1', {
        title: 'Updated Article',
        content: 'Updated content',
      });
      expect(api.post).not.toHaveBeenCalled();
      expect(result.id).toBe(1);
    });
  });
});
