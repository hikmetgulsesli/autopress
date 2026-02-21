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

  // Search functionality tests
  it('renders search input', () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    const searchInput = screen.getByLabelText('Trend arama');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Trendlerde ara...');
  });

  it('filters trends by search query', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Trend arama');
    fireEvent.change(searchInput, { target: { value: 'yapay' } });

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      expect(screen.queryByText('Climate Change')).not.toBeInTheDocument();
      expect(screen.queryByText('Ekonomi')).not.toBeInTheDocument();
    });
  });

  it('clears search when clear button clicked', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Trend arama') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'yapay' } });

    expect(searchInput.value).toBe('yapay');

    const clearButton = screen.getByLabelText('Aramayı temizle');
    fireEvent.click(clearButton);

    expect(searchInput.value).toBe('');
    await waitFor(() => {
      expect(screen.getByText('Climate Change')).toBeInTheDocument();
    });
  });

  it('shows no results message for empty search', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    const searchInput = screen.getByLabelText('Trend arama');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('Sonuç bulunamadı')).toBeInTheDocument();
      expect(screen.getByText(/"nonexistent" ile ilgili trend bulunamadı/)).toBeInTheDocument();
    });
  });

  // Create Article button tests
  it('displays "Makale" button for each trend', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    const createButtons = screen.getAllByLabelText(/için makale oluştur/i);
    expect(createButtons.length).toBeGreaterThan(0);
  });

  it('navigates to content studio when create article clicked', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    
    // Mock window.location
    delete (window as any).location;
    window.location = { href: '' } as any;

    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    const createButton = screen.getByLabelText('"Yapay Zeka" için makale oluştur');
    fireEvent.click(createButton);

    expect(window.location.href).toContain('/content-studio');
    expect(window.location.href).toContain('trend=Yapay%20Zeka');
    expect(window.location.href).toContain('trendId=1');
  });

  // Interest Over Time chart tests
  it('shows interest over time chart when trend is clicked', async () => {
    const mockInterestData = [
      { date: '2024-01-10', value: 50 },
      { date: '2024-01-11', value: 65 },
      { date: '2024-01-12', value: 80 },
      { date: '2024-01-13', value: 70 },
      { date: '2024-01-14', value: 90 },
      { date: '2024-01-15', value: 95 },
    ];
    
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

    // Click on first trend
    const trendCard = screen.getByText('Yapay Zeka').closest('li');
    fireEvent.click(trendCard!);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('interest-over-time'));
    });

    await waitFor(() => {
      expect(screen.getByText('İlgi Zaman Çizelgesi')).toBeInTheDocument();
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument(); // Trend name in chart
    });
  });

  it('calls interest over time API with correct parameters', async () => {
    const mockInterestData = [{ date: '2024-01-15', value: 95 }];
    
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

    const trendCard = screen.getByText('Yapay Zeka').closest('li');
    fireEvent.click(trendCard!);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('keyword=Yapay%20Zeka')
      );
    });
  });

  it('shows loading state in chart while fetching interest data', async () => {
    const mockInterestData = [{ date: '2024-01-15', value: 95 }];
    
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    mockApi.get.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ data: mockInterestData }), 100)
    ));
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    const trendCard = screen.getByText('Yapay Zeka').closest('li');
    fireEvent.click(trendCard!);

    await waitFor(() => {
      expect(screen.getByText(/Yükleniyor/i)).toBeInTheDocument();
    });
  });

  it('closes chart when close button clicked', async () => {
    const mockInterestData = [{ date: '2024-01-15', value: 95 }];
    
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

    // Open chart
    const trendCard = screen.getByText('Yapay Zeka').closest('li');
    fireEvent.click(trendCard!);

    await waitFor(() => {
      expect(screen.getByText('İlgi Zaman Çizelgesi')).toBeInTheDocument();
    });

    // Close chart
    const closeButton = screen.getByLabelText('Grafikyi kapat');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('İlgi Zaman Çizelgesi')).not.toBeInTheDocument();
    });
  });

  it('resets chart when region filter changes', async () => {
    const mockInterestData = [{ date: '2024-01-15', value: 95 }];
    
    mockApi.get.mockResolvedValueOnce({ data: mockTrends });
    mockApi.get.mockResolvedValueOnce({ data: mockInterestData });
    mockApi.get.mockResolvedValueOnce({ data: mockTrends }); // Fetch for new region
    
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
    });

    // Open chart
    const trendCard = screen.getByText('Yapay Zeka').closest('li');
    fireEvent.click(trendCard!);

    await waitFor(() => {
      expect(screen.getByText('İlgi Zaman Çizelgesi')).toBeInTheDocument();
    });

    // Change region
    const regionSelect = screen.getByLabelText('Bölge filtresi');
    fireEvent.change(regionSelect, { target: { value: 'US' } });

    await waitFor(() => {
      expect(screen.queryByText('İlgi Zaman Çizelgesi')).not.toBeInTheDocument();
    });
  });
});
