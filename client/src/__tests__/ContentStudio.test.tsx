import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ContentStudio from '../pages/ContentStudio';
import api from '../services/api';

// Mock the Layout component
vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('ContentStudio - Article Loading from URL Param', () => {
  const mockApi = api as ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (initialEntry: string) => {
    return render(
      <BrowserRouter initialEntries={[initialEntry]}>
        <ContentStudio />
      </BrowserRouter>
    );
  };

  it('should load article when article ID is present in URL', async () => {
    const mockArticle = {
      id: 123,
      title: 'Test Article',
      content: '<p>Test content</p>',
      featured_image_url: 'https://example.com/image.jpg',
    };

    mockApi.get.mockResolvedValueOnce({ data: mockArticle });

    renderWithRouter('/?article=123');

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/articles/123');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Article')).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching article', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    mockApi.get.mockReturnValueOnce(promise);

    renderWithRouter('/?article=123');

    await waitFor(() => {
      expect(screen.getByText(/yükleniyor/i)).toBeInTheDocument();
    });

    resolvePromise!({ data: { id: 123, title: 'Test', content: '<p>Test</p>' } });
  });

  it('should show error state when article is not found (404)', async () => {
    mockApi.get.mockRejectedValueOnce({
      response: { status: 404, data: { error: 'Makale bulunamadı' } },
    });

    renderWithRouter('/?article=999');

    await waitFor(() => {
      expect(screen.getByText('Makale bulunamadı')).toBeInTheDocument();
    });
  });

  it('should show error state on general API error', async () => {
    mockApi.get.mockRejectedValueOnce({
      response: { status: 500, data: { error: 'Sunucu hatası' } },
    });

    renderWithRouter('/?article=123');

    await waitFor(() => {
      expect(screen.getByText('Sunucu hatası')).toBeInTheDocument();
    });
  });

  it('should not fetch article when no article ID in URL', async () => {
    renderWithRouter('/');

    await waitFor(() => {
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });
});
