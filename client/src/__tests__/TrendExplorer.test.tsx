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

  const mockInterestData = {
    keyword: 'Yapay Zeka',
    data: [
      { date: '2024-01-08', value: 45, formattedValue: '45' },
      { date: '2024-01-09', value: 52, formattedValue: '52' },
      { date: '2024-01-10', value: 48, formattedValue: '48' },
      { date: '2024-01-11', value: 65, formattedValue: '65' },
      { date: '2024-01-12', value: 78, formattedValue: '78' },
      { date: '2024-01-13', value: 85, formattedValue: '85' },
      { date: '2024-01-14', value: 92, formattedValue: '92' },
    ],
    average: 66,
  };

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

  // New tests for Interest History Chart feature
  describe('Interest History Chart', () => {
    it('shows detail panel when a trend is clicked', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: mockInterestData });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      // Detail panel should appear
      await waitFor(() => {
        expect(screen.getByTestId('trend-detail-panel')).toBeInTheDocument();
      });

      // Check detail panel content
      expect(screen.getByTestId('detail-title')).toHaveTextContent('Yapay Zeka');
    });

    it('fetches interest over time data when trend is selected', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: mockInterestData });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      // Should call the interest-over-time endpoint
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('/trends/interest-over-time')
        );
      });
    });

    it('displays time range options (7/30/90 days)', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: mockInterestData });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      // Check time range buttons
      await waitFor(() => {
        expect(screen.getByTestId('time-range-7')).toBeInTheDocument();
        expect(screen.getByTestId('time-range-30')).toBeInTheDocument();
        expect(screen.getByTestId('time-range-90')).toBeInTheDocument();
      });

      expect(screen.getByText('Son 7 Gün')).toBeInTheDocument();
      expect(screen.getByText('Son 30 Gün')).toBeInTheDocument();
      expect(screen.getByText('Son 90 Gün')).toBeInTheDocument();
    });

    it('changes time range when clicked', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: mockInterestData });
      mockApi.get.mockResolvedValueOnce({ data: { ...mockInterestData, data: [] } });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      await waitFor(() => {
        expect(screen.getByTestId('time-range-7')).toBeInTheDocument();
      });

      // Click on 7 days button
      fireEvent.click(screen.getByTestId('time-range-7'));

      // Should fetch new data
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(3);
      });
    });

    it('closes detail panel when close button is clicked', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: mockInterestData });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      await waitFor(() => {
        expect(screen.getByTestId('trend-detail-panel')).toBeInTheDocument();
      });

      // Click close button
      const closeBtn = screen.getByTestId('close-detail-btn');
      fireEvent.click(closeBtn);

      // Detail panel should be removed
      await waitFor(() => {
        expect(screen.queryByTestId('trend-detail-panel')).not.toBeInTheDocument();
      });
    });

    it('shows chart section when trend is selected', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: mockInterestData });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      // Wait for detail panel
      await waitFor(() => {
        expect(screen.getByTestId('trend-detail-panel')).toBeInTheDocument();
      });

      // Check that the chart section is rendered
      expect(screen.getByText('İlgi Geçmişi')).toBeInTheDocument();
    });

    it('shows chart loading state', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      // Delay the interest data response
      mockApi.get.mockImplementationOnce(() => new Promise(() => {}));
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      // Should show chart loading
      await waitFor(() => {
        expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
      });
    });

    it('shows chart error state when API fails', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockRejectedValueOnce(new Error('Chart data error'));
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      // Should show chart error
      await waitFor(() => {
        expect(screen.getByTestId('chart-error')).toBeInTheDocument();
      });
    });

    it('shows chart empty state when no data', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: { keyword: 'Test', data: [], average: 0 } });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      // Should show chart empty state
      await waitFor(() => {
        expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
      });
    });

    it('renders interest chart when data is available', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: mockInterestData });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      // Wait for detail panel
      await waitFor(() => {
        expect(screen.getByTestId('trend-detail-panel')).toBeInTheDocument();
      });

      // Check that the chart section is rendered
      expect(screen.getByText('İlgi Geçmişi')).toBeInTheDocument();
    });

    it('highlights selected trend', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: mockInterestData });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.click(trendItem);

      // Selected trend should have ring class
      await waitFor(() => {
        expect(trendItem).toHaveClass('ring-2');
      });
    });

    it('supports keyboard navigation for trend selection', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: mockInterestData });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Press Enter on the first trend
      const trendItem = screen.getByTestId('trend-item-1');
      fireEvent.keyDown(trendItem, { key: 'Enter' });

      // Detail panel should appear
      await waitFor(() => {
        expect(screen.getByTestId('trend-detail-panel')).toBeInTheDocument();
      });
    });
  });
});
