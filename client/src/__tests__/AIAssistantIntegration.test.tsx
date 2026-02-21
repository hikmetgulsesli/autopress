import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ContentStudio from '../pages/ContentStudio';

// Mock dependencies
const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('../services/api', () => ({
  default: {
    post: (...args: any[]) => mockPost(...args),
    get: (...args: any[]) => mockGet(...args),
  },
}));

// Mock react-router-dom
const mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, vi.fn()],
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

describe('AI Assistant Integration - Title Suggestions (US-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Başlık Öner" button in AI tab', async () => {
    render(<ContentStudio />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('AI Asistan')).toBeInTheDocument();
    });

    // Click on AI tab
    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    // Check for "Başlık Öner" button
    expect(screen.getByText('Başlık Öner')).toBeInTheDocument();
  });

  it('calls suggest-title API with correct parameters', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValueOnce({
      data: {
        suggestions: ['Suggested Title 1', 'Suggested Title 2', 'Suggested Title 3'],
      },
    });

    render(<ContentStudio />);

    // Fill in fields
    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Test Title');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, 'Test content here');

    // Go to AI tab
    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    // Click suggest button
    const suggestButton = screen.getByText('Başlık Öner');
    await userEvent.click(suggestButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/content/suggest-title',
        expect.objectContaining({
          title: 'Test Title',
          content: 'Test content here',
          language: 'tr',
        })
      );
    });
  });

  it('displays title suggestions in a panel', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValueOnce({
      data: {
        suggestions: ['Suggestion 1', 'Suggestion 2', 'Suggestion 3'],
      },
    });

    render(<ContentStudio />);

    // Go to AI tab and click suggest
    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Original Title');

    const suggestButton = screen.getByText('Başlık Öner');
    await userEvent.click(suggestButton);

    // Check for suggestions panel
    await waitFor(() => {
      expect(screen.getByText(/başlık önerileri/i)).toBeInTheDocument();
      expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
      expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
      expect(screen.getByText('Suggestion 3')).toBeInTheDocument();
    });
  });

  it('populates title field when clicking a suggestion', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValueOnce({
      data: {
        suggestions: ['New Suggested Title'],
      },
    });

    render(<ContentStudio />);

    // Go to AI tab and get suggestions
    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Original Title');

    const suggestButton = screen.getByText('Başlık Öner');
    await userEvent.click(suggestButton);

    // Wait for suggestions
    await waitFor(() => {
      expect(screen.getByText('New Suggested Title')).toBeInTheDocument();
    });

    // Click on a suggestion
    const suggestion = screen.getByText('New Suggested Title');
    await userEvent.click(suggestion);

    // Verify title is updated
    await waitFor(() => {
      expect(titleInput).toHaveValue('New Suggested Title');
    });

    expect(mockNotifySuccess).toHaveBeenCalledWith('Başlık güncellendi');
  });

  it('shows loading state during API call', async () => {
    let resolvePromise: any;
    mockPost.mockReturnValueOnce(new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Test');

    const suggestButton = screen.getByText('Başlık Öner');
    await userEvent.click(suggestButton);

    // Check for loading state
    await waitFor(() => {
      const loadingSpinner = document.querySelector('[class*="animate-spin"]');
      expect(loadingSpinner).toBeInTheDocument();
    });

    resolvePromise({ data: { suggestions: ['Test'] } });
  });

  it('shows error toast on API failure', async () => {
    const user = userEvent.setup();

    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          error: 'API Error occurred',
        },
      },
    });

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Test');

    const suggestButton = screen.getByText('Başlık Öner');
    await userEvent.click(suggestButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('API Error occurred');
    });
  });

  it('shows validation error when title and content are empty', async () => {
    const user = userEvent.setup();

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const suggestButton = screen.getByText('Başlık Öner');
    await userEvent.click(suggestButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith(expect.stringContaining('girin'));
    });

    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('AI Assistant Integration - SEO Analysis (US-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "SEO Analizi" button in AI tab', async () => {
    render(<ContentStudio />);

    await waitFor(() => {
      expect(screen.getByText('AI Asistan')).toBeInTheDocument();
    });

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    expect(screen.getByText('SEO Analizi')).toBeInTheDocument();
  });

  it('calls analyze-seo API with correct parameters', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValueOnce({
      data: {
        score: 85,
        suggestions: ['Add more subheadings', 'Improve keyword placement'],
        metrics: {
          wordCount: 500,
          keywordDensity: 2.5,
          readabilityScore: 70,
        },
      },
    });

    render(<ContentStudio />);

    // Fill in required fields
    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'SEO Test Article');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, 'Test content for SEO analysis');

    // Go to SEO tab to set slug
    const seoTab = screen.getByRole('button', { name: /^seo$/i });
    await userEvent.click(seoTab);

    const slugInput = screen.getByTestId('slug-input');
    await user.type(slugInput, 'seo-test-article');

    // Go to AI tab and click analyze
    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const analyzeButton = screen.getByText('SEO Analizi');
    await userEvent.click(analyzeButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/content/analyze-seo',
        expect.objectContaining({
          title: 'SEO Test Article',
          content: 'Test content for SEO analysis',
          slug: 'seo-test-article',
        })
      );
    });
  });

  it('displays SEO analysis results in a panel', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValueOnce({
      data: {
        score: 85,
        suggestions: ['Add more subheadings', 'Improve keyword placement'],
        metrics: {
          wordCount: 500,
          keywordDensity: 2.5,
          readabilityScore: 70,
        },
      },
    });

    render(<ContentStudio />);

    // Go through tabs to set up data
    const seoTab = screen.getByRole('button', { name: /^seo$/i });
    await userEvent.click(seoTab);

    const slugInput = screen.getByTestId('slug-input');
    await user.type(slugInput, 'test-slug');

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Test');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, 'Content');

    const analyzeButton = screen.getByText('SEO Analizi');
    await userEvent.click(analyzeButton);

    // Check for SEO results panel
    await waitFor(() => {
      expect(screen.getByText(/seo analizi/i)).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('Add more subheadings')).toBeInTheDocument();
      expect(screen.getByText('Improve keyword placement')).toBeInTheDocument();
    });
  });

  it('displays SEO score with appropriate color coding', async () => {
    const user = userEvent.setup();

    // Test good score (>=80)
    mockPost.mockResolvedValueOnce({
      data: {
        score: 85,
        suggestions: [],
        metrics: {},
      },
    });

    render(<ContentStudio />);

    const seoTab = screen.getByRole('button', { name: /^seo$/i });
    await userEvent.click(seoTab);

    const slugInput = screen.getByTestId('slug-input');
    await user.type(slugInput, 'test-slug');

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Test');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, 'Content');

    const analyzeButton = screen.getByText('SEO Analizi');
    await userEvent.click(analyzeButton);

    await waitFor(() => {
      const scoreElement = screen.getByText('85');
      expect(scoreElement).toBeInTheDocument();
    });
  });

  it('shows loading state during SEO analysis', async () => {
    let resolvePromise: any;
    mockPost.mockReturnValueOnce(new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    render(<ContentStudio />);

    const seoTab = screen.getByRole('button', { name: /^seo$/i });
    await userEvent.click(seoTab);

    const slugInput = screen.getByTestId('slug-input');
    await user.type(slugInput, 'test-slug');

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Test');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, 'Test');

    const analyzeButton = screen.getByText('SEO Analizi');
    await userEvent.click(analyzeButton);

    await waitFor(() => {
      const loadingSpinner = document.querySelector('[class*="animate-spin"]');
      expect(loadingSpinner).toBeInTheDocument();
    });

    resolvePromise({ data: { score: 80, suggestions: [], metrics: {} } });
  });

  it('shows error toast on SEO analysis failure', async () => {
    const user = userEvent.setup();

    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          error: 'SEO analysis failed',
        },
      },
    });

    render(<ContentStudio />);

    const seoTab = screen.getByRole('button', { name: /^seo$/i });
    await userEvent.click(seoTab);

    const slugInput = screen.getByTestId('slug-input');
    await user.type(slugInput, 'test-slug');

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Test');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, 'Content');

    const analyzeButton = screen.getByText('SEO Analizi');
    await userEvent.click(analyzeButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('SEO analysis failed');
    });
  });

  it('shows validation error when required fields are missing', async () => {
    const user = userEvent.setup();

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const analyzeButton = screen.getByText('SEO Analizi');
    await userEvent.click(analyzeButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith(expect.stringContaining('girin'));
    });

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('closes suggestion panel when close button is clicked', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValueOnce({
      data: { suggestions: ['Suggestion 1'] },
    });

    render(<ContentStudio />);

    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Test');

    const suggestButton = screen.getByText('Başlık Öner');
    await userEvent.click(suggestButton);

    await waitFor(() => {
      expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByRole('button', { name: /kapat/i }) || document.querySelector('[aria-label="Close"]');
    if (closeButton) {
      await userEvent.click(closeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText('Suggestion 1')).not.toBeInTheDocument();
    });
  });
});

describe('AI Assistant Integration - Full Workflow (US-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes full title suggestion workflow', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValueOnce({
      data: {
        suggestions: ['Better Title Suggestion'],
      },
    });

    render(<ContentStudio />);

    // Fill content
    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'Original Title');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, 'Test content');

    // Get suggestions
    const suggestButton = screen.getByText('Başlık Öner');
    await userEvent.click(suggestButton);

    await waitFor(() => {
      expect(screen.getByText('Better Title Suggestion')).toBeInTheDocument();
    });

    // Select suggestion
    const suggestion = screen.getByText('Better Title Suggestion');
    await userEvent.click(suggestion);

    // Verify selection
    await waitFor(() => {
      expect(titleInput).toHaveValue('Better Title Suggestion');
      expect(mockNotifySuccess).toHaveBeenCalledWith('Başlık güncellendi');
      expect(screen.queryByText('Better Title Suggestion')).not.toBeInTheDocument();
    });
  });

  it('completes full SEO analysis workflow', async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValueOnce({
      data: {
        score: 75,
        suggestions: ['Improve headings structure', 'Add internal links'],
        metrics: {
          wordCount: 300,
          keywordDensity: 1.8,
        },
      },
    });

    render(<ContentStudio />);

    // Set up content
    const aiTab = screen.getByRole('button', { name: /ai$/i });
    await userEvent.click(aiTab);

    const titleInput = screen.getByPlaceholderText(/başlık/i);
    await user.type(titleInput, 'SEO Test');

    const contentEditor = screen.getByTestId('tiptap-editor');
    await user.type(contentEditor, 'SEO content');

    // Set slug
    const seoTab = screen.getByRole('button', { name: /^seo$/i });
    await userEvent.click(seoTab);

    const slugInput = screen.getByTestId('slug-input');
    await user.type(slugInput, 'seo-test-slug');

    // Run SEO analysis
    await userEvent.click(aiTab);

    const analyzeButton = screen.getByText('SEO Analizi');
    await userEvent.click(analyzeButton);

    // Verify results
    await waitFor(() => {
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('Improve headings structure')).toBeInTheDocument();
      expect(screen.getByText('Add internal links')).toBeInTheDocument();
    });

    expect(mockNotifySuccess).toHaveBeenCalledWith(expect.stringContaining('tamamlandı'));
  });
});
