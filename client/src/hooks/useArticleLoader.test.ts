import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import api from '../services/api';

// Mock react-router-dom - create a mutable mock
let mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, vi.fn()],
}));

// Mock api
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Import after mocks
import { useArticleLoader } from './useArticleLoader';

describe('useArticleLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('returns null article when no article param in URL', () => {
    const { result } = renderHook(() => useArticleLoader());

    expect(result.current.article).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches article when article param is present', async () => {
    const mockArticle = {
      id: 1,
      title: 'Test Article',
      content: '<p>Test content</p>',
      status: 'draft',
    };

    mockSearchParams.set('article', '1');
    (api.get as any).mockResolvedValueOnce({ data: mockArticle });

    const { result } = renderHook(() => useArticleLoader());

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);

    // Wait for the fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.get).toHaveBeenCalledWith('/articles/1');
    expect(result.current.article).toEqual(mockArticle);
    expect(result.current.error).toBeNull();
  });

  it('handles 404 error when article not found', async () => {
    mockSearchParams.set('article', '999');
    (api.get as any).mockRejectedValueOnce({
      response: { status: 404, data: { error: 'Makale bulunamadı' } },
    });

    const { result } = renderHook(() => useArticleLoader());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.article).toBeNull();
    expect(result.current.error).toBe('Makale bulunamadı');
  });

  it('handles generic error when fetch fails', async () => {
    mockSearchParams.set('article', '1');
    (api.get as any).mockRejectedValueOnce({
      response: { data: { error: 'Sunucu hatası' } },
    });

    const { result } = renderHook(() => useArticleLoader());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.article).toBeNull();
    expect(result.current.error).toBe('Sunucu hatası');
  });

  it('shows loading state during fetch', async () => {
    mockSearchParams.set('article', '1');
    
    // Create a promise that we can control
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (api.get as any).mockReturnValueOnce(promise);

    const { result } = renderHook(() => useArticleLoader());

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    resolvePromise!({ data: { id: 1, title: 'Test' } });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
