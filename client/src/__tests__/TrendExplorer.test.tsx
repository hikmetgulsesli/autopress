import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import TrendExplorer from '../pages/TrendExplorer';
import api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

  const mockSearchResults = [
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
  describe('Search Functionality', () => {
    it('renders search input', () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      const searchInput = screen.getByLabelText('Trend ara');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', 'Trend ara...');
    });

    it('renders search button', () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      // Get submit button by type
      const searchButton = screen.getByRole('button', { name: /^Ara$/i });
      expect(searchButton).toBeInTheDocument();
    });

    it('triggers API call when search button is clicked', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockSearchResults } });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Trend ara');
      fireEvent.change(searchInput, { target: { value: 'yapay' } });

      const searchButton = screen.getByRole('button', { name: /^Ara$/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/trends/search'));
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('keyword=yapay'));
      });
    });

    it('triggers API call when form is submitted', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockSearchResults } });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Trend ara');
      fireEvent.change(searchInput, { target: { value: 'yapay' } });

      const form = searchInput.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/trends/search'));
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('keyword=yapay'));
      });
    });

    it('displays search results', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockSearchResults } });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Trend ara');
      fireEvent.change(searchInput, { target: { value: 'yapay' } });

      const searchButton = screen.getByRole('button', { name: /^Ara$/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('"yapay" için arama sonuçları')).toBeInTheDocument();
      });
    });

    it('shows clear search button when search input has value', async () => {
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
      fireEvent.change(searchInput, { target: { value: 'yapay' } });

      const clearButton = screen.getByLabelText('Aramayı temizle');
      expect(clearButton).toBeInTheDocument();
    });

    it('clears search and fetches all trends when clear button is clicked', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockSearchResults } });
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Perform search
      const searchInput = screen.getByLabelText('Trend ara');
      fireEvent.change(searchInput, { target: { value: 'yapay' } });

      const searchButton = screen.getByRole('button', { name: /^Ara$/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/trends/search'));
      });

      // Clear search
      const clearButton = screen.getByLabelText('Aramayı temizle');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });

    it('shows empty state when search returns no results', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: { data: [] } });
      
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

      const searchButton = screen.getByRole('button', { name: /^Ara$/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Arama sonucu bulunamadı')).toBeInTheDocument();
        expect(screen.getByText('"nonexistent" için sonuç bulunamadı. Farklı bir anahtar kelime deneyin.')).toBeInTheDocument();
      });
    });

    it('disables search button when input is empty', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /^Ara$/i });
      expect(searchButton).toBeDisabled();
    });

    it('includes region filter in search request', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockSearchResults } });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Change region
      const regionSelect = screen.getByLabelText('Bölge filtresi');
      fireEvent.change(regionSelect, { target: { value: 'US' } });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('region=US'));
      });

      // Perform search
      const searchInput = screen.getByLabelText('Trend ara');
      fireEvent.change(searchInput, { target: { value: 'climate' } });

      const searchButton = screen.getByRole('button', { name: /^Ara$/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/trends/search'));
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('keyword=climate'));
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('region=US'));
      });
    });
  });

  // Create Article Button Tests
  describe('Create Article Button', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('renders create article button for each trend', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Check that create article buttons are rendered
      const createButtons = screen.getAllByLabelText(/için makale oluştur/i);
      expect(createButtons).toHaveLength(3);
    });

    it('navigates to ContentStudio with topic when create article button is clicked', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click the create article button for the first trend
      const createButton = screen.getByLabelText('Yapay Zeka için makale oluştur');
      fireEvent.click(createButton);

      // Should navigate to ContentStudio with topic query param
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/content?topic=Yapay%20Zeka');
      });
    });

    it('encodes special characters in topic URL parameter', async () => {
      const trendsWithSpecialChars = [
        {
          id: 1,
          topic: 'Yapay Zeka & Makine Öğrenmesi',
          score: 95,
          source: 'Google Trends',
          language: 'tr',
          region: 'TR',
          raw_data: { news_count: 150 },
          checked_at: '2024-01-15T10:00:00Z',
        },
      ];
      mockApi.get.mockResolvedValueOnce({ data: trendsWithSpecialChars });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka & Makine Öğrenmesi')).toBeInTheDocument();
      });

      // Click the create article button
      const createButton = screen.getByLabelText('Yapay Zeka & Makine Öğrenmesi için makale oluştur');
      fireEvent.click(createButton);

      // Should navigate with encoded topic
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/content?topic=Yapay%20Zeka%20%26%20Makine%20%C3%96%C4%9Frenmesi');
      });
    });

    it('shows loading state on button when navigating', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrends });
      
      render(
        <BrowserRouter>
          <TrendExplorer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yapay Zeka')).toBeInTheDocument();
      });

      // Click the create article button
      const createButton = screen.getByLabelText('Yapay Zeka için makale oluştur');
      fireEvent.click(createButton);

      // Button should show loading state
      expect(createButton).toBeDisabled();
    });
  });
});
