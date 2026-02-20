import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ContentStudio from '../pages/ContentStudio';
import { contentService } from '../services/content.service';

// Mock the content service
vi.mock('../services/content.service', () => ({
  contentService: {
    generateContent: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
    getArticle: vi.fn(),
  },
}));

// Mock TipTapEditor
vi.mock('../components/content/TipTapEditor', () => ({
  default: ({ content, onChange }: { content: string; onChange?: (content: string) => void }) => (
    <textarea
      data-testid="tiptap-editor"
      value={content}
      onChange={(e) => onChange?.(e.target.value)}
      className="min-h-[300px]"
    />
  ),
}));

// Mock SEOPreviewPanel
vi.mock('../components/content/SEOPreviewPanel', () => ({
  default: ({ title, metaDescription, slug }: { title: string; metaDescription: string; slug: string }) => (
    <div data-testid="seo-preview-panel">
      <span data-testid="seo-title">{title}</span>
      <span data-testid="seo-meta">{metaDescription}</span>
      <span data-testid="seo-slug">{slug}</span>
    </div>
  ),
}));

describe('ContentStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ContentStudio with all required form fields', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    // Header
    expect(screen.getByText('İçerik Stüdyosu')).toBeInTheDocument();
    expect(screen.getByText('AI ile SEO uyumlu içerik üretin ve düzenleyin')).toBeInTheDocument();

    // Form fields
    expect(screen.getByPlaceholderText('Makale başlığını girin')).toBeInTheDocument();
    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Arama sonuçlarında görünecek açıklama')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('url-dostu-slug')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Kategori seçin')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Makalenin kısa bir özeti')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com/image.jpg')).toBeInTheDocument();
  });

  it('shows SEO preview panel with Google SERP simulation', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    expect(screen.getByTestId('seo-preview-panel')).toBeInTheDocument();
  });

  it('has AI Generate button that opens modal', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const aiButton = screen.getByText('AI Üret');
    expect(aiButton).toBeInTheDocument();

    fireEvent.click(aiButton);

    expect(screen.getByText('AI İçerik Üret')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Örn: Dijital pazarlama stratejileri')).toBeInTheDocument();
  });

  it('shows category selection dropdown', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText('Kategori seçin')).toBeInTheDocument();
  });

  it('shows featured image URL input', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText('https://example.com/image.jpg')).toBeInTheDocument();
  });

  it('shows real-time character counter for title', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const titleInput = screen.getByPlaceholderText('Makale başlığını girin');
    fireEvent.change(titleInput, { target: { value: 'Test Başlık' } });

    // Check for character counter label
    expect(screen.getByText('Başlık Uzunluğu')).toBeInTheDocument();
  });

  it('shows real-time character counter for meta description', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const metaInput = screen.getByPlaceholderText('Arama sonuçlarında görünecek açıklama');
    fireEvent.change(metaInput, { target: { value: 'Test meta açıklama' } });

    // Check for character counter label
    expect(screen.getByText('Meta Açıklama Uzunluğu')).toBeInTheDocument();
  });

  it('auto-generates slug from title', async () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const titleInput = screen.getByPlaceholderText('Makale başlığını girin');
    fireEvent.change(titleInput, { target: { value: 'Test Makale Basligi' } });

    await waitFor(() => {
      const slugInput = screen.getByPlaceholderText('url-dostu-slug') as HTMLInputElement;
      // Slug should contain the slugified title
      expect(slugInput.value).toContain('test-makale');
    });
  });

  it('triggers content generation via API when AI Generate is clicked', async () => {
    const mockGeneratedContent = {
      title: 'AI Generated Title',
      slug: 'ai-generated-title',
      excerpt: 'Generated excerpt',
      metaDescription: 'Generated meta description',
      content: '<p>Generated content</p>',
      headings: { h1: 'AI Generated Title', h2: [], h3: [] },
    };

    vi.mocked(contentService.generateContent).mockResolvedValue(mockGeneratedContent);

    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    // Open AI modal
    fireEvent.click(screen.getByText('AI Üret'));

    // Fill in the topic
    const topicInput = screen.getByPlaceholderText('Örn: Dijital pazarlama stratejileri');
    fireEvent.change(topicInput, { target: { value: 'Test Topic' } });

    // Submit
    fireEvent.click(screen.getByText('İçerik Üret'));

    await waitFor(() => {
      expect(contentService.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'Test Topic',
          contentType: 'blog',
          language: 'TR',
          wordCount: 1000,
        })
      );
    });
  });

  it('creates article via API on form submission', async () => {
    vi.mocked(contentService.createArticle).mockResolvedValue({
      id: 1,
      title: 'Test Title',
      content: 'Test content',
    } as any);

    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    // Fill in required fields
    fireEvent.change(screen.getByPlaceholderText('Makale başlığını girin'), {
      target: { value: 'Test Title' },
    });
    fireEvent.change(screen.getByTestId('tiptap-editor'), {
      target: { value: 'Test content' },
    });

    // Submit
    fireEvent.click(screen.getByText('Yayınla'));

    await waitFor(() => {
      expect(contentService.createArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          content: 'Test content',
          status: 'review',
        })
      );
    });
  });

  it('shows validation error when title is empty', async () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    // Try to submit without title
    fireEvent.click(screen.getByText('Yayınla'));

    await waitFor(() => {
      expect(screen.getByText('Başlık gereklidir')).toBeInTheDocument();
    });
  });

  it('shows validation error when title exceeds 60 characters', async () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const longTitle = 'a'.repeat(61);
    fireEvent.change(screen.getByPlaceholderText('Makale başlığını girin'), {
      target: { value: longTitle },
    });

    fireEvent.click(screen.getByText('Yayınla'));

    await waitFor(() => {
      expect(screen.getByText('Başlık 60 karakterden uzun olmamalıdır')).toBeInTheDocument();
    });
  });

  it('shows validation error when meta description exceeds 160 characters', async () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const longMeta = 'a'.repeat(161);
    fireEvent.change(screen.getByPlaceholderText('Arama sonuçlarında görünecek açıklama'), {
      target: { value: longMeta },
    });

    fireEvent.click(screen.getByText('Yayınla'));

    await waitFor(() => {
      expect(screen.getByText('Meta açıklama 160 karakterden uzun olmamalıdır')).toBeInTheDocument();
    });
  });

  it('shows status options in publishing settings', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    expect(screen.getByText('Taslak')).toBeInTheDocument();
    expect(screen.getByText('İncelemede')).toBeInTheDocument();
    expect(screen.getByText('Planlandı')).toBeInTheDocument();
    expect(screen.getByText('Yayınlandı')).toBeInTheDocument();
  });

  it('shows content statistics', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    expect(screen.getByText('İçerik İstatistikleri')).toBeInTheDocument();
    expect(screen.getByText('Kelime')).toBeInTheDocument();
    expect(screen.getByText('Dakika Okuma')).toBeInTheDocument();
  });
});
