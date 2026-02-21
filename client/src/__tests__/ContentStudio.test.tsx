import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Create hoisted mocks that can be used in vi.mock
const { mockPost, mockPut, mockGet, mockSuccess, mockError } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockGet: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

// Mock api module
vi.mock('../services/api', () => ({
  default: {
    post: mockPost,
    put: mockPut,
    get: mockGet,
  },
}));

// Mock toast module
vi.mock('../utils/toast', () => ({
  notify: {
    success: mockSuccess,
    error: mockError,
  },
}));

// Create a variable to control the mock return value
let mockArticleValue: any = null;

vi.mock('../hooks/useArticleLoader', () => ({
  useArticleLoader: () => ({
    article: mockArticleValue,
    isLoading: false,
    error: null,
  }),
}));

// Import after mocks
import ContentStudio from '../pages/ContentStudio';

// Mock useSearchParams to test topic pre-fill
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

describe('ContentStudio Article Save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockArticleValue = null;
    mockSearchParams.delete('topic');
  });

  afterEach(() => {
    mockArticleValue = null;
    mockSearchParams.delete('topic');
  });

  const renderContentStudio = () => {
    return render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );
  };

  describe('POST /api/articles (new article)', () => {
    it('makes POST request when saving new article', async () => {
      const mockArticleResponse = {
        id: 1,
        title: 'New Article Title',
        content: '<p>Test content</p>',
      };
      
      mockPost.mockResolvedValueOnce({ data: mockArticleResponse });

      renderContentStudio();

      // Fill in the title
      const titleInput = screen.getByLabelText('Başlık');
      fireEvent.change(titleInput, { target: { value: 'New Article Title' } });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      fireEvent.click(saveButton);

      // Wait for save to complete and check API was called
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/articles', expect.objectContaining({
          title: 'New Article Title',
          content: '',
          featured_image_url: null,
        }));
      });

      // Should show success toast
      expect(mockSuccess).toHaveBeenCalledWith('Makale başarıyla kaydedildi');
    });

    it('shows error toast when POST fails', async () => {
      mockPost.mockRejectedValueOnce({
        response: { data: { error: 'Sunucu hatası' } },
      });

      renderContentStudio();

      // Fill in the title
      const titleInput = screen.getByLabelText('Başlık');
      fireEvent.change(titleInput, { target: { value: 'New Article Title' } });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      fireEvent.click(saveButton);

      // Should show error toast
      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith('Sunucu hatası');
      });
    });

    it('shows error when title is empty', async () => {
      renderContentStudio();

      // Click save without title
      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      fireEvent.click(saveButton);

      // Should show error toast for empty title
      expect(mockError).toHaveBeenCalledWith('Lütfen bir başlık girin');
      
      // Should NOT have called API
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/articles/:id (existing article)', () => {
    it('makes PUT request when editing existing article', async () => {
      // Set the mock to return an existing article
      mockArticleValue = {
        id: 1,
        title: 'Existing Article',
        content: '<p>Existing content</p>',
      };

      const mockUpdatedArticle = {
        id: 1,
        title: 'Updated Article',
        content: '<p>Updated content</p>',
      };
      
      mockPut.mockResolvedValueOnce({ data: mockUpdatedArticle });

      renderContentStudio();

      // Wait for article to load
      await waitFor(() => {
        expect(screen.getByLabelText('Başlık')).toHaveValue('Existing Article');
      });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      fireEvent.click(saveButton);

      // Wait for save to complete
      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith('/articles/1', expect.objectContaining({
          title: 'Existing Article',
          content: '<p>Existing content</p>',
        }));
      });

      // Should show update success toast
      expect(mockSuccess).toHaveBeenCalledWith('Makale başarıyla güncellendi');
    });

    it('shows error toast when PUT fails', async () => {
      // Set the mock to return an existing article
      mockArticleValue = {
        id: 1,
        title: 'Existing Article',
        content: '<p>Existing content</p>',
      };

      mockPut.mockRejectedValueOnce({
        response: { data: { error: 'Güncelleme başarısız' } },
      });

      renderContentStudio();

      // Wait for article to load
      await waitFor(() => {
        expect(screen.getByLabelText('Başlık')).toHaveValue('Existing Article');
      });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      fireEvent.click(saveButton);

      // Should show error toast
      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith('Güncelleme başarısız');
      });
    });
  });

  describe('Topic Pre-fill from URL', () => {
    it('displays topic from URL query param in AI Assistant card', async () => {
      mockSearchParams.set('topic', 'Yapay Zeka');

      renderContentStudio();

      // Should display the topic in the AI Assistant card
      await waitFor(() => {
        expect(screen.getByText('Trend Konusu')).toBeInTheDocument();
      });

      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    it('does not display topic section when no topic in URL', async () => {
      renderContentStudio();

      // Should not display the topic section
      expect(screen.queryByText('Trend Konusu')).not.toBeInTheDocument();
    });

    it('displays encoded topic correctly', async () => {
      mockSearchParams.set('topic', 'Yapay Zeka & Makine Öğrenmesi');

      renderContentStudio();

      // Should display the decoded topic
      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka & Makine Öğrenmesi')).toBeInTheDocument();
      });
    });
  });
});
