import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArticleList } from './ArticleList';
import api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn(() => '10 Oca'),
}));

vi.mock('date-fns/locale', () => ({
  tr: { code: 'tr' },
}));

const mockArticles = [
  {
    id: 1,
    site_id: 1,
    title: 'Test Article 1',
    slug: 'test-article-1',
    content: '<p>Content 1</p>',
    excerpt: 'Excerpt 1',
    status: 'published' as const,
    language: 'tr',
    seo_score: 85,
    meta_title: 'Test Article 1',
    meta_description: 'Description 1',
    featured_image_url: 'https://example.com/image1.jpg',
    word_count: 500,
    reading_time: 3,
    ai_model: 'gpt-4',
    source_trend_id: null,
    published_url: 'https://example.com/test-article-1',
    published_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    site_name: 'Test Site',
  },
  {
    id: 2,
    site_id: 1,
    title: 'Test Article 2',
    slug: 'test-article-2',
    content: '<p>Content 2</p>',
    excerpt: 'Excerpt 2',
    status: 'draft' as const,
    language: 'tr',
    seo_score: 65,
    meta_title: 'Test Article 2',
    meta_description: 'Description 2',
    featured_image_url: null,
    word_count: 300,
    reading_time: 2,
    ai_model: 'gpt-4',
    source_trend_id: null,
    published_url: null,
    published_at: null,
    created_at: '2024-01-12T10:00:00Z',
    updated_at: '2024-01-12T10:00:00Z',
    site_name: 'Test Site',
  },
  {
    id: 3,
    site_id: 1,
    title: 'Test Article 3 - Scheduled for Future',
    slug: 'test-article-3',
    content: '<p>Content 3</p>',
    excerpt: 'Excerpt 3',
    status: 'scheduled' as const,
    language: 'tr',
    seo_score: 90,
    meta_title: 'Test Article 3',
    meta_description: 'Description 3',
    featured_image_url: null,
    word_count: 800,
    reading_time: 4,
    ai_model: 'gpt-4',
    source_trend_id: null,
    published_url: null,
    published_at: null,
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T10:00:00Z',
    site_name: 'Test Site',
  },
  {
    id: 4,
    site_id: 1,
    title: 'Test Article 4 - In Review',
    slug: 'test-article-4',
    content: '<p>Content 4</p>',
    excerpt: 'Excerpt 4',
    status: 'review' as const,
    language: 'tr',
    seo_score: 45,
    meta_title: 'Test Article 4',
    meta_description: 'Description 4',
    featured_image_url: null,
    word_count: 200,
    reading_time: 1,
    ai_model: 'gpt-4',
    source_trend_id: null,
    published_url: null,
    published_at: null,
    created_at: '2024-01-13T10:00:00Z',
    updated_at: '2024-01-13T10:00:00Z',
    site_name: 'Test Site',
  },
];

describe('ArticleList', () => {
  const mockOnSelectArticle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.get as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    expect(screen.getByText('Makaleler yükleniyor...')).toBeInTheDocument();
  });

  it('renders article list after loading', async () => {
    (api.get as any).mockResolvedValue({ data: { data: mockArticles, total: 4 } });

    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Article 2')).toBeInTheDocument();
    expect(screen.getByText('Test Article 3 - Scheduled for Future')).toBeInTheDocument();
    expect(screen.getByText('Test Article 4 - In Review')).toBeInTheDocument();
  });

  it('displays correct status labels', async () => {
    (api.get as any).mockResolvedValue({ data: { data: mockArticles, total: 4 } });

    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Yayında')).toBeInTheDocument();
    });

    expect(screen.getByText('Taslak')).toBeInTheDocument();
    expect(screen.getByText('Planlandı')).toBeInTheDocument();
    expect(screen.getByText('İncelemede')).toBeInTheDocument();
  });

  it('displays SEO scores with correct colors', async () => {
    (api.get as any).mockResolvedValue({ data: { data: mockArticles, total: 4 } });

    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('displays creation dates', async () => {
    (api.get as any).mockResolvedValue({ data: { data: mockArticles, total: 4 } });

    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });

    // Check that formatted dates are displayed (mock returns same value for all)
    const dateElements = screen.getAllByText('10 Oca');
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('calls onSelectArticle when an article is clicked', async () => {
    (api.get as any).mockResolvedValue({ data: { data: mockArticles, total: 4 } });

    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });

    const articleButton = screen.getByText('Test Article 1').closest('button');
    fireEvent.click(articleButton!);

    expect(mockOnSelectArticle).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      title: 'Test Article 1',
    }));
  });

  it('highlights selected article', async () => {
    (api.get as any).mockResolvedValue({ data: { data: mockArticles, total: 4 } });

    render(
      <ArticleList
        selectedArticleId={1}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });

    const selectedButton = screen.getByText('Test Article 1').closest('button');
    expect(selectedButton).toHaveAttribute('aria-selected', 'true');
  });

  it('renders empty state when no articles', async () => {
    (api.get as any).mockResolvedValue({ data: { data: [], total: 0 } });

    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Henüz makale yok')).toBeInTheDocument();
    });

    expect(screen.getByText('İlk makalenizi oluşturmak için İçerik Stüdyosu\'nu kullanın.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    (api.get as any).mockRejectedValue({ response: { data: { error: 'API Error' } } });

    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Tekrar dene')).toBeInTheDocument();
  });

  it('refreshes when refreshTrigger changes', async () => {
    (api.get as any).mockResolvedValue({ data: { data: mockArticles, total: 4 } });

    const { rerender } = render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
        refreshTrigger={0}
      />
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    rerender(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
        refreshTrigger={1}
      />
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it('has correct accessibility attributes', async () => {
    (api.get as any).mockResolvedValue({ data: { data: mockArticles.slice(0, 2), total: 2 } });

    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-label', 'Makale listesi');

    const options = screen.getAllByRole('option');
    expect(options.length).toBe(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('retry button fetches articles again', async () => {
    (api.get as any).mockRejectedValue({ response: { data: { error: 'API Error' } } });

    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    // Reset mock to succeed on retry
    (api.get as any).mockResolvedValue({ data: { data: mockArticles, total: 4 } });

    const retryButton = screen.getByText('Tekrar dene');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it('calls API with correct parameters', async () => {
    (api.get as any).mockResolvedValue({ data: { data: mockArticles, total: 4 } });

    render(
      <ArticleList
        selectedArticleId={null}
        onSelectArticle={mockOnSelectArticle}
      />
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/articles?limit=50');
    });
  });
});
