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

  const mockInterestData = [
    { date: '2024-01-01', value: 25 },
    { date: '2024-01-02', value: 45 },
    { date: '2024-01-03', value: 60 },
    { date: '2024-01-04', value: 80 },
    { date: '2024-01-05', value: 100 },
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

  // New tests for US-003
  describe('Search functionality', () => {
    it('displays search input', () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      const searchInput = screen.getByLabelText('Trend ara');
      expect(searchInput).toBeInTheDocument();
    });

    it('filters trends by keyword', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Trend ara');
      fireEvent.change(searchInput, { target: { value: 'Yapay' } });

      await waitFor(() => {
        expect(screen.getByText('"Yapay" için 1 sonuç bulundu')).toBeInTheDocument();
      });

      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      expect(screen.queryByText('Climate Change')).not.toBeInTheDocument();
      expect(screen.queryByText('Ekonomi')).not.toBeInTheDocument();
    });

    it('shows empty state when search has no results', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Trend ara');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('Sonuç bulunamadı')).toBeInTheDocument();
      });
    });

    it('clears search with clear button', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Trend ara');
      fireEvent.change(searchInput, { target: { value: 'Yapay' } });

      await waitFor(() => {
        expect(screen.getByText('"Yapay" için 1 sonuç bulundu')).toBeInTheDocument();
      });

      const clearButton = screen.getByLabelText('Aramayı temizle');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('3 trend bulundu')).toBeInTheDocument();
      });
    });
  });

  describe('Create Article button', () => {
    it('displays Makale Oluştur button for each trend', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Check that buttons exist
      const buttons = screen.getAllByText('Makale Oluştur');
      expect(buttons.length).toBe(3);
    });
  });

  describe('Interest over time chart', () => {
    it('fetches interest data when trend is selected', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockTrends }) // trends
        .mockResolvedValueOnce({ data: { data: mockInterestData } }); // interest data
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on first trend
      const firstTrend = screen.getByText('Yapay Zeka').closest('li');
      fireEvent.click(firstTrend!);

      await waitFor(() => {
        expect(screen.getByText('İlgi Grafiği: Yapay Zeka')).toBeInTheDocument();
      });

      // Check that interest API was called
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/trends/interest-over-time')
      );
    });

    it('closes chart when close button is clicked', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockTrends })
        .mockResolvedValueOnce({ data: { data: mockInterestData } });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on first trend to open chart
      const firstTrend = screen.getByText('Yapay Zeka').closest('li');
      fireEvent.click(firstTrend!);

      await waitFor(() => {
        expect(screen.getByText('İlgi Grafiği: Yapay Zeka')).toBeInTheDocument();
      });

      // Close the chart
      const closeButton = screen.getByLabelText('Grafiği kapat');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('İlgi Grafiği: Yapay Zeka')).not.toBeInTheDocument();
      });
    });
  });
});
