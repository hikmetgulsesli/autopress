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

describe('TrendExplorer', () => {
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

  it('renders the TrendExplorer page without placeholder', () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    expect(screen.getByText('Trend Explorer')).toBeInTheDocument();
    expect(screen.getByText('Güncel trendleri keşfedin ve analiz edin')).toBeInTheDocument();
  });

  it('displays country/region dropdown filter', () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    const regionSelect = screen.getByLabelText('Bölge filtresi');
    expect(regionSelect).toBeInTheDocument();
    expect(regionSelect).toHaveValue('all');
  });

  it('displays trends list with title, score, and news count', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    // Check titles
    expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    expect(screen.getByText('Climate Change')).toBeInTheDocument();
    expect(screen.getByText('Ekonomi')).toBeInTheDocument();

    // Check scores
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it('updates list when filter changes', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    mockApi.get.mockResolvedValueOnce({ data: [mockTrends[1]] }); // Only US trend
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    const regionSelect = screen.getByLabelText('Bölge filtresi');
    fireEvent.change(regionSelect, { target: { value: 'US' } });

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('region=US'));
    });
  });

  it('shows loading state during fetch', () => {
    // Delay the resolution to keep loading state
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    expect(screen.getByText('Trendler yükleniyor...')).toBeInTheDocument();
  });

  it('shows error state on failure', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Bir hata oluştu')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('shows retry button on error', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tekrar Dene')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tekrar Dene'));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });
  });

  it('shows empty state when no trends', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Henüz trend yok')).toBeInTheDocument();
    });
  });

  it('displays trend count', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('3 trend bulundu')).toBeInTheDocument();
    });
  });

  it('renders region options correctly', () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    const regionSelect = screen.getByLabelText('Bölge filtresi');
    expect(regionSelect).toContainElement(screen.getByText('Tüm Bölgeler'));
    expect(regionSelect).toContainElement(screen.getByText('Türkiye'));
    expect(regionSelect).toContainElement(screen.getByText('ABD'));
  });
});
