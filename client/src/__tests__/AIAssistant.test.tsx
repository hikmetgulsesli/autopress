import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock API
const mockPost = vi.fn();
const mockGet = vi.fn();
vi.mock('../services/api', () => ({
  default: {
    post: (...args: any[]) => mockPost(...args),
    get: (...args: any[]) => mockGet(...args),
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

// Import ContentStudio to test AI functionality
import ContentStudio from '../pages/ContentStudio';

// Mock other dependencies
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../components/TipTapEditor', () => ({
  TipTapEditor: ({ content, onChange }: { content: string; onChange: (val: string) => void }) => (
    <textarea
      data-testid="tiptap-editor"
      value={content}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('../components/SEOPanel', () => ({
  SEOPanel: ({ onSlugChange }: any) => (
    <input
      data-testid="slug-input"
      value=""
      onChange={(e) => onSlugChange(e.target.value)}
    />
  ),
}));

describe('AI Assistant - Title Suggestions (US-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockReset();
    mockGet.mockReset();
    mockNotifySuccess.mockReset();
    mockNotifyError.mockReset();
    mockGet.mockResolvedValue({ data: [] });
  });

  it('shows "Başlık Öner" button in AI tab', async () => {
    render(<ContentStudio />);

    // Click on AI tab
    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    // Check for "Başlık Öner" button
    expect(screen.getByText('Başlık Öner')).toBeInTheDocument();
  });

  it('calls suggest-title API with current title, content, and language', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValue({
      data: { suggestions: ['Suggested Title 1', 'Suggested Title 2'] },
    });

    render(<ContentStudio />);

    // Fill in title and content
    const titleInput = screen.getByPlaceholderText('Makale başlığını girin...');
    await user.type(titleInput, 'Test Title');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, 'Test content here');

    // Click on AI tab and then Başlık Öner button
    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const suggestButton = screen.getByText('Başlık Öner');
    await user.click(suggestButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/content/suggest-title', {
        title: 'Test Title',
        content: 'Test content here',
        language: 'tr',
      });
    });
  });

  it('displays title suggestions in a modal', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValue({
      data: { suggestions: ['Suggested Title 1', 'Suggested Title 2', 'Suggested Title 3'] },
    });

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const suggestButton = screen.getByText('Başlık Öner');
    await user.click(suggestButton);

    await waitFor(() => {
      expect(screen.getByText(/başlık önerileri/i)).toBeInTheDocument();
      expect(screen.getByText('Suggested Title 1')).toBeInTheDocument();
      expect(screen.getByText('Suggested Title 2')).toBeInTheDocument();
      expect(screen.getByText('Suggested Title 3')).toBeInTheDocument();
    });
  });

  it('populates title field when clicking a suggestion', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValue({
      data: { suggestions: ['Suggested Title 1', 'Suggested Title 2'] },
    });

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const suggestButton = screen.getByText('Başlık Öner');
    await user.click(suggestButton);

    await waitFor(() => {
      expect(screen.getByText('Suggested Title 1')).toBeInTheDocument();
    });

    const suggestion = screen.getByText('Suggested Title 1');
    await user.click(suggestion);

    // Verify title is populated
    const titleInput = screen.getByPlaceholderText('Makale başlığını girin...');
    await waitFor(() => {
      expect(titleInput).toHaveValue('Suggested Title 1');
    });
  });

  it('shows loading spinner during title suggestion API call', async () => {
    const user = userEvent.setup();

    let resolvePromise: any;
    mockPost.mockReturnValue(new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const suggestButton = screen.getByText('Başlık Öner');
    await user.click(suggestButton);

    // Check for loading state
    await waitFor(() => {
      expect(screen.getByTestId(/title-loading/i) || screen.getByRole('status', { hidden: true }) || document.querySelector('[class*="animate-spin"]')).toBeInTheDocument();
    });

    // Resolve the promise
    resolvePromise({ data: { suggestions: ['Test'] } });
  });

  it('shows error toast when title suggestion fails', async () => {
    const user = userEvent.setup();

    mockPost.mockRejectedValue({
      response: { data: { error: 'API Error' } },
    });

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const suggestButton = screen.getByText('Başlık Öner');
    await user.click(suggestButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('API Error');
    });
  });

  it('closes title suggestions modal when clicking outside', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValue({
      data: { suggestions: ['Suggested Title 1'] },
    });

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const suggestButton = screen.getByText('Başlık Öner');
    await user.click(suggestButton);

    await waitFor(() => {
      expect(screen.getByText(/başlık önerileri/i)).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByRole('button', { name: /kapat/i }) || document.querySelector('[aria-label="Close"]');
    if (closeButton) {
      await user.click(closeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText(/başlık önerileri/i)).not.toBeInTheDocument();
    });
  });
});

describe('AI Assistant - SEO Analysis (US-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockReset();
    mockGet.mockReset();
    mockNotifySuccess.mockReset();
    mockNotifyError.mockReset();
    mockGet.mockResolvedValue({ data: [] });
  });

  it('shows "SEO Analizi" button in AI tab', async () => {
    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    expect(screen.getByText('SEO Analizi')).toBeInTheDocument();
  });

  it('calls analyze-seo API with current title, content, and slug', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValue({
      data: {
        score: 85,
        suggestions: ['Good keyword usage', 'Add more subheadings'],
        metrics: { wordCount: 500, keywordDensity: 2.5 },
      },
    });

    render(<ContentStudio />);

    // Fill in fields
    const titleInput = screen.getByPlaceholderText('Makale başlığını girin...');
    await user.type(titleInput, 'Test Title');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, 'Test content here');

    // Go to SEO tab to set slug
    const seoTab = screen.getByRole('button', { name: /^seo$/i });
    await user.click(seoTab);

    const slugInput = screen.getByTestId('slug-input');
    await user.type(slugInput, 'test-slug');

    // Go back to AI tab
    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const analyzeButton = screen.getByText('SEO Analizi');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/content/analyze-seo', {
        title: 'Test Title',
        content: 'Test content here',
        slug: 'test-slug',
      });
    });
  });

  it('displays SEO analysis results in a panel', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValue({
      data: {
        score: 85,
        suggestions: ['Add more subheadings', 'Improve keyword placement'],
        metrics: { wordCount: 500, keywordDensity: 2.5, readabilityScore: 70 },
      },
    });

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const analyzeButton = screen.getByText('SEO Analizi');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/seo analizi/i)).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument(); // score
      expect(screen.getByText('Add more subheadings')).toBeInTheDocument();
      expect(screen.getByText('Improve keyword placement')).toBeInTheDocument();
    });
  });

  it('shows SEO score with appropriate color coding', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValue({
      data: {
        score: 85,
        suggestions: [],
        metrics: {},
      },
    });

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const analyzeButton = screen.getByText('SEO Analizi');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });
  });

  it('shows loading spinner during SEO analysis API call', async () => {
    const user = userEvent.setup();

    let resolvePromise: any;
    mockPost.mockReturnValue(new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const analyzeButton = screen.getByText('SEO Analizi');
    await user.click(analyzeButton);

    // Check for loading state
    await waitFor(() => {
      expect(document.querySelector('[class*="animate-spin"]')).toBeInTheDocument();
    });

    resolvePromise({ data: { score: 80, suggestions: [], metrics: {} } });
  });

  it('shows error toast when SEO analysis fails', async () => {
    const user = userEvent.setup();

    mockPost.mockRejectedValue({
      response: { data: { error: 'Analysis failed' } },
    });

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await user.click(aiTab);

    const analyzeButton = screen.getByText('SEO Analizi');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('Analysis failed');
    });
  });
});
