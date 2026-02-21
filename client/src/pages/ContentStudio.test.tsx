import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

// Import after mocks
import ContentStudio from './ContentStudio';

describe('ContentStudio - Article Save API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockReset();
    mockPut.mockReset();
    mockNotifySuccess.mockReset();
    mockNotifyError.mockReset();
  });

  it('renders ContentStudio with save button', () => {
    render(<ContentStudio />);
    
    expect(screen.getByText('İçerik Stüdyosu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kaydet/i })).toBeInTheDocument();
  });

  it('has title input field', () => {
    render(<ContentStudio />);
    
    expect(screen.getByPlaceholderText('Makale başlığını girin...')).toBeInTheDocument();
  });

  it('has content editor', () => {
    render(<ContentStudio />);
    
    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
  });

  it('shows validation error when trying to save without title', async () => {
    const user = userEvent.setup();
    render(<ContentStudio />);

    const saveButton = screen.getByRole('button', { name: /kaydet/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('Lütfen bir başlık girin');
    });
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

  it('shows success toast after saving new article', async () => {
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

  it('shows error toast when save fails', async () => {
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
});
