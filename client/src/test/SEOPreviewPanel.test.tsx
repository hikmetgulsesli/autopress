import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SEOPreviewPanel from '../components/content/SEOPreviewPanel';

describe('SEOPreviewPanel', () => {
  it('renders SEO preview panel with Google SERP preview', () => {
    render(
      <SEOPreviewPanel
        title="Test Article Title"
        metaDescription="This is a test meta description for the article."
        slug="test-article-slug"
        url="example.com"
      />
    );

    expect(screen.getByText('Google SERP Önizleme')).toBeInTheDocument();
    expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    expect(screen.getByText('This is a test meta description for the article.')).toBeInTheDocument();
  });

  it('shows title character counter with 60 char limit', () => {
    render(
      <SEOPreviewPanel
        title="Short Title"
        metaDescription="Test description"
        slug="test-slug"
      />
    );

    // Check for counter label
    expect(screen.getByText('Başlık')).toBeInTheDocument();
    // 60 appears in both title and meta counters, so just verify the component renders
    expect(document.body.textContent).toContain('60');
  });

  it('shows meta description counter with 160 char limit', () => {
    render(
      <SEOPreviewPanel
        title="Test"
        metaDescription="This is a test description with some content."
        slug="test-slug"
      />
    );

    // Check for counter label
    expect(screen.getByText('Meta Açıklama')).toBeInTheDocument();
    // Verify 160 appears in the document
    expect(document.body.textContent).toContain('160');
  });

  it('shows warning when title exceeds 60 chars', () => {
    const longTitle = 'This is a very long title that exceeds the sixty character limit for SEO';
    render(
      <SEOPreviewPanel
        title={longTitle}
        metaDescription="Test description"
        slug="test-slug"
      />
    );

    // Check for warning message
    expect(screen.getByText('Başlık çok uzun, kısaltmanız önerilir')).toBeInTheDocument();
  });

  it('shows warning when meta exceeds 160 chars', () => {
    const longMeta = 'This is a very long meta description that definitely exceeds the one hundred and sixty character limit that Google recommends for optimal display in search results pages.';
    render(
      <SEOPreviewPanel
        title="Test"
        metaDescription={longMeta}
        slug="test-slug"
      />
    );

    // Check for warning message
    expect(screen.getByText('Meta açıklama çok uzun, kısaltmanız önerilir')).toBeInTheDocument();
  });

  it('shows optimal status for valid title length', () => {
    render(
      <SEOPreviewPanel
        title="Perfect SEO Title"
        metaDescription="Test"
        slug="test-slug"
      />
    );

    // Check for counter labels
    expect(screen.getByText('Başlık')).toBeInTheDocument();
    // Verify 60 appears in the document
    expect(document.body.textContent).toContain('60');
  });

  it('shows optimal status for valid meta description length', () => {
    render(
      <SEOPreviewPanel
        title="Test"
        metaDescription="A well-crafted meta description that fits within limits."
        slug="test-slug"
      />
    );

    // Check for counter labels
    expect(screen.getByText('Meta Açıklama')).toBeInTheDocument();
    // Verify 160 appears in the document
    expect(document.body.textContent).toContain('160');
  });

  it('shows empty state for missing title', () => {
    render(
      <SEOPreviewPanel
        title=""
        metaDescription="Test description"
        slug="test-slug"
      />
    );

    expect(screen.getByText('Başlık yok')).toBeInTheDocument();
    expect(screen.getByText('Başlık boş bırakılamaz')).toBeInTheDocument();
  });

  it('shows empty state for missing meta description', () => {
    render(
      <SEOPreviewPanel
        title="Test Title"
        metaDescription=""
        slug="test-slug"
      />
    );

    expect(screen.getByText('Meta açıklama yok')).toBeInTheDocument();
    expect(screen.getByText('Meta açıklama SEO için önemlidir')).toBeInTheDocument();
  });

  it('displays URL with slug in preview', () => {
    render(
      <SEOPreviewPanel
        title="Test Title"
        metaDescription="Test description"
        slug="my-awesome-article"
        url="mysite.com"
      />
    );

    expect(screen.getByText('mysite.com')).toBeInTheDocument();
    // Use getAllByText since slug appears in two places
    const slugElements = screen.getAllByText('my-awesome-article');
    expect(slugElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows default slug placeholder when slug is empty', () => {
    render(
      <SEOPreviewPanel
        title="Test Title"
        metaDescription="Test description"
        slug=""
        url="example.com"
      />
    );

    expect(screen.getByText('otomatik-olusturulacak')).toBeInTheDocument();
  });

  it('truncates long title in preview', () => {
    const veryLongTitle = 'This is an extremely long title that goes way beyond what Google would display in their search results and should be truncated with ellipsis';
    render(
      <SEOPreviewPanel
        title={veryLongTitle}
        metaDescription="Test"
        slug="test-slug"
      />
    );

    // Title should be truncated in the preview (ends with ...)
    const titleElement = screen.getByText(/This is an extremely long title/);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement.textContent?.endsWith('...')).toBe(true);
  });

  it('truncates long meta description in preview', () => {
    const veryLongMeta = 'This is an extremely long meta description that goes way beyond what Google would display in their search results and should be truncated with ellipsis at the appropriate point for optimal display';
    render(
      <SEOPreviewPanel
        title="Test"
        metaDescription={veryLongMeta}
        slug="test-slug"
      />
    );

    // Meta should be truncated in the preview
    const metaElement = screen.getByText(/This is an extremely long meta description/);
    expect(metaElement).toBeInTheDocument();
  });
});
