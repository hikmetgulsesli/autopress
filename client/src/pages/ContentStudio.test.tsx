import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentStudio from './ContentStudio';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

// Mock api
const mockPost = vi.fn();
const mockPut = vi.fn();
vi.mock('../services/api', () => ({
  default: {
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    get: vi.fn(),
  },
}));

// Mock toast notifications
const mockNotifySuccess = vi.fn();
const mockNotifyError = vi.fn();
vi.mock('../utils/toast', () => ({
  notify: {
    success: (...args: any[]) => mockNotifySuccess(...args),
    error: (...args: any[]) => mockNotifyError(...args),
  },
}));

// Mock TipTapEditor
vi.mock('../components/TipTapEditor', () => ({
  TipTapEditor: ({ content, onChange }: { content: string; onChange: (val: string) => void }) => (
    <textarea
      data-testid="tiptap-editor"
      value={content}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Mock ImageSearch and ImageAttribution
vi.mock('../components/ImageSearch', () => ({
  default: () => <div data-testid="image-search">Image Search</div>,
}));

vi.mock('../components/ImageAttribution', () => ({
  default: () => <div data-testid="image-attribution">Image Attribution</div>,
}));

// Mock hooks
vi.mock('../hooks/useArticleLoader', () => ({
  useArticleLoader: () => ({
    article: null,
    isLoading: false,
    error: null,
  }),
}));

describe('ContentStudio - Article Save API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('makes POST request for new articles', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      data: { id: 1, title: 'Test Article', content: '<p>Test content</p>' },
    });

    render(<ContentStudio />);

    // Fill in title
    const titleInput = screen.getByPlaceholderText('Makale başlığını girin...');
    await user.type(titleInput, 'Test Article');

    // Fill in content
    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, '<p>Test content</p>');

    // Click save button
    const saveButton = screen.getByRole('button', { name: /kaydet/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/articles', expect.objectContaining({
        title: 'Test Article',
        content: '<p>Test content</p>',
      }));
    });
  });

  it('shows success toast on successful save', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      data: { id: 1, title: 'Test Article', content: '<p>Test content</p>' },
    });

    render(<ContentStudio />);

    const titleInput = screen.getByPlaceholderText('Makale başlığını girin...');
    await user.type(titleInput, 'Test Article');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, '<p>Test content</p>');

    const saveButton = screen.getByRole('button', { name: /kaydet/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockNotifySuccess).toHaveBeenCalledWith('Makale başarıyla kaydedildi');
    });
  });

  it('shows error toast on save failure', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValueOnce({
      response: { data: { error: 'Sunucu hatası' } },
    });

    render(<ContentStudio />);

    const titleInput = screen.getByPlaceholderText('Makale başlığını girin...');
    await user.type(titleInput, 'Test Article');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, '<p>Test content</p>');

    const saveButton = screen.getByRole('button', { name: /kaydet/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('Sunucu hatası');
    });
  });

  it('shows validation error when title is empty', async () => {
    const user = userEvent.setup();
    render(<ContentStudio />);

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, '<p>Test content</p>');

    const saveButton = screen.getByRole('button', { name: /kaydet/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('Başlık ve içerik alanları zorunludur');
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows validation error when content is empty', async () => {
    const user = userEvent.setup();
    render(<ContentStudio />);

    const titleInput = screen.getByPlaceholderText('Makale başlığını girin...');
    await user.type(titleInput, 'Test Article');

    const saveButton = screen.getByRole('button', { name: /kaydet/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('Başlık ve içerik alanları zorunludur');
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('disables save button while saving', async () => {
    const user = userEvent.setup();
    // Create a promise that won't resolve immediately
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockPost.mockReturnValueOnce(promise);

    render(<ContentStudio />);

    const titleInput = screen.getByPlaceholderText('Makale başlığını girin...');
    await user.type(titleInput, 'Test Article');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, '<p>Test content</p>');

    const saveButton = screen.getByRole('button', { name: /kaydet/i });
    await user.click(saveButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText('Kaydediliyor...')).toBeInTheDocument();
    });

    // Resolve the promise
    resolvePromise!({ data: { id: 1, title: 'Test Article' } });
  });
});

describe('ContentStudio - Edit Existing Article', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('makes PUT request for existing articles', async () => {
    const user = userEvent.setup();
    
    // Override the mock to return an existing article
    vi.doMock('../hooks/useArticleLoader', () => ({
      useArticleLoader: () => ({
        article: { id: 5, title: 'Existing Article', content: '<p>Existing content</p>' },
        isLoading: false,
        error: null,
      }),
    }));

    mockPut.mockResolvedValueOnce({
      data: { id: 5, title: 'Updated Article', content: '<p>Updated content</p>' },
    });

    // Re-import to get the mocked hook
    const { default: ContentStudioWithArticle } = await import('./ContentStudio');
    render(<ContentStudioWithArticle />);

    const saveButton = screen.getByRole('button', { name: /kaydet/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/articles/5', expect.any(Object));
    });

    // Reset the mock
    vi.doUnmock('../hooks/useArticleLoader');
  });
});
