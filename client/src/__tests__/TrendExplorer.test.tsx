import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TrendExplorer from '../pages/TrendExplorer';
import api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn> };

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('TrendExplorer - Create Article Button', () => {
  const mockTrends = [
    {
      id: 1,
      topic: 'Yapay Zeka',
      score: 95,
      source: 'Google Trends',
      language: 'tr',
      region: 'TR',
      raw_data: { news_count: 150 },
      checked_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      topic: 'Climate Change',
      score: 88,
      source: 'Twitter',
      language: 'en',
      region: 'US',
      raw_data: { news_count: 230 },
      checked_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 3,
      topic: 'Ekonomi',
      score: 72,
      source: 'Google Trends',
      language: 'tr',
      region: 'TR',
      raw_data: { news_count: 89 },
      checked_at: '2024-01-15T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Create Article button on each trend card', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    // Check that Create Article buttons are rendered for each trend
    const createButtons = screen.getAllByText('Create Article');
    expect(createButtons).toHaveLength(3);
  });

  it('navigates to ContentStudio with topic query parameter when Create Article is clicked', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    // Click the Create Article button for the first trend
    const createButtons = screen.getAllByText('Create Article');
    fireEvent.click(createButtons[0]);

    // Verify navigation with correct topic
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/content?topic=Yapay%20Zeka');
    });
  });

  it('encodes special characters in topic URL parameter', async () => {
    const specialTrend = {
      id: 4,
      topic: 'AI & Machine Learning: The Future',
      score: 90,
      source: 'Google Trends',
      language: 'en',
      region: 'US',
      raw_data: {},
      checked_at: '2024-01-15T10:00:00Z',
    };
    
    mockApi.get.mockResolvedValueOnce({ data: [specialTrend] });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('AI & Machine Learning: The Future')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Article');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/content?topic=AI%20%26%20Machine%20Learning%3A%20The%20Future');
    });
  });

  it('shows loading state on Create Article button while navigating', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    const createButtons = screen.getAllByText('Create Article');
    fireEvent.click(createButtons[0]);

    // Check that button shows loading state
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('disables Create Article button while loading', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    const createButtons = screen.getAllByText('Create Article');
    fireEvent.click(createButtons[0]);

    // Check that the clicked button is disabled
    await waitFor(() => {
      const loadingButton = screen.getByText('Loading...').closest('button');
      expect(loadingButton).toBeDisabled();
    });
  });

  it('has accessible aria-label on Create Article buttons', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    // Check for accessible button labels
    expect(screen.getByLabelText('Create article about Yapay Zeka')).toBeInTheDocument();
    expect(screen.getByLabelText('Create article about Climate Change')).toBeInTheDocument();
    expect(screen.getByLabelText('Create article about Ekonomi')).toBeInTheDocument();
  });

  it('renders trend information correctly', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    // Check trend titles
    expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    expect(screen.getByText('Climate Change')).toBeInTheDocument();
    expect(screen.getByText('Ekonomi')).toBeInTheDocument();

    // Check scores are displayed
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();

    // Check regions
    expect(screen.getAllByText('TR')).toHaveLength(2);
    expect(screen.getByText('US')).toBeInTheDocument();
  });

  it('shows loading state while fetching trends', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    expect(screen.getByText('Loading trends...')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    mockApi.get.mockRejectedValueOnce({ response: { data: { error: 'Failed to fetch trends' } } });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch trends')).toBeInTheDocument();
    });
  });

  it('shows empty state when no trends available', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Trends Available')).toBeInTheDocument();
    });

    expect(screen.getByText('Check back later for trending topics')).toBeInTheDocument();
  });

  it('allows retry when error occurs', async () => {
    mockApi.get.mockRejectedValueOnce({ response: { data: { error: 'Network error' } } });
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Try Again'));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });
  });
});
