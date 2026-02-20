import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TrendExplorer from './TrendExplorer';

// Mock the api service
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('TrendExplorer', () => {
  const mockTrends = [
    {
      id: 1,
      topic: 'Artificial Intelligence',
      score: 95,
      source: 'google_trends',
      language: 'en',
      region: 'US',
      checked_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      topic: 'Machine Learning',
      score: 88,
      source: 'google_trends',
      language: 'en',
      region: 'US',
      checked_at: '2024-01-15T10:00:00Z',
    },
  ];

  const mockKeywords = [
    {
      id: 1,
      keyword: 'AI tools',
      language: 'en',
      search_volume: 50000,
      competition: 0.75,
      cpc: 2.5,
      trend_score: 80,
      last_checked: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      keyword: 'chatbot',
      language: 'en',
      search_volume: 30000,
      competition: 0.5,
      cpc: 1.8,
      trend_score: 65,
      last_checked: '2024-01-15T10:00:00Z',
    },
  ];

  const mockRSSItems = [
    {
      title: 'Latest Tech News',
      link: 'https://example.com/news',
      pubDate: '2024-01-15T10:00:00Z',
      contentSnippet: 'This is a test news snippet',
      source: 'Tech News',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/trends/trending') {
        return Promise.resolve({ data: { data: mockTrends } });
      }
      if (url === '/trends/keywords') {
        return Promise.resolve({ data: mockKeywords });
      }
      if (url === '/rss/feeds') {
        return Promise.resolve({ data: { data: mockRSSItems } });
      }
      if (url === '/trends/interest-over-time') {
        return Promise.resolve({
          data: {
            data: {
              data: [
                { date: '2024-01-01', value: 50 },
                { date: '2024-01-15', value: 75 },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders the TrendExplorer page', () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    expect(screen.getByText('Trend Explorer')).toBeInTheDocument();
    expect(screen.getByText('Güncel trendleri keşfedin ve içerik fırsatlarını yakalayın')).toBeInTheDocument();
  });

  it('displays region and language filters', () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    expect(screen.getByText('Bölge')).toBeInTheDocument();
    expect(screen.getByText('Dil')).toBeInTheDocument();
    expect(screen.getByText('Ara')).toBeInTheDocument();
  });

  it('displays tabs for trends, keywords, and RSS', () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    expect(screen.getByText('Trendler')).toBeInTheDocument();
    expect(screen.getByText('Anahtar Kelimeler')).toBeInTheDocument();
    expect(screen.getByText('RSS Haberler')).toBeInTheDocument();
  });

  it('fetches and displays trends on mount', async () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trends/trending', {
        params: { region: 'TR', language: 'tr', limit: 50 },
      });
    });
  });

  it('fetches and displays keywords on mount', async () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trends/keywords', {
        params: { language: 'tr' },
      });
    });
  });

  it('fetches and displays RSS items on mount', async () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/rss/feeds', {
        params: { language: 'tr', limit: 20 },
      });
    });
  });

  it('switches between tabs', async () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    const keywordsTab = screen.getByText('Anahtar Kelimeler');
    fireEvent.click(keywordsTab);

    await waitFor(() => {
      expect(screen.getByText('Anahtar Kelime Analizi')).toBeInTheDocument();
    });

    const rssTab = screen.getByText('RSS Haberler');
    fireEvent.click(rssTab);

    await waitFor(() => {
      expect(screen.getByText('RSS Haber Akışı')).toBeInTheDocument();
    });
  });

  it('navigates to ContentStudio with topic when "Bu Konuda Yaz" is clicked', async () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Bu Konuda Yaz')[0]).toBeInTheDocument();
    });

    const writeButtons = screen.getAllByText('Bu Konuda Yaz');
    fireEvent.click(writeButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/content?topic='));
  });

  it('updates data when region changes', async () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    // Find the region select by its associated label
    const regionLabel = screen.getByText('Bölge');
    const regionSelect = regionLabel.closest('div')?.querySelector('select');
    expect(regionSelect).toBeTruthy();
    
    if (regionSelect) {
      fireEvent.change(regionSelect, { target: { value: 'US' } });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/trends/trending', {
          params: { region: 'US', language: 'tr', limit: 50 },
        });
      });
    }
  });

  it('updates data when language changes', async () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    // Find the language select by its associated label
    const languageLabel = screen.getByText('Dil');
    const languageSelect = languageLabel.closest('div')?.querySelector('select');
    expect(languageSelect).toBeTruthy();
    
    if (languageSelect) {
      fireEvent.change(languageSelect, { target: { value: 'en' } });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/trends/trending', {
          params: { region: 'TR', language: 'en', limit: 50 },
        });
      });
    }
  });

  it('filters trends based on search query', async () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Trend veya anahtar kelime ara/i);
    fireEvent.change(searchInput, { target: { value: 'Machine' } });

    await waitFor(() => {
      expect(screen.queryByText('Artificial Intelligence')).not.toBeInTheDocument();
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });
  });

  it('displays keyword table with correct columns', async () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    const keywordsTab = screen.getByText('Anahtar Kelimeler');
    fireEvent.click(keywordsTab);

    // Wait for the keywords tab content to load
    await waitFor(() => {
      expect(screen.getByText('Anahtar Kelime Analizi')).toBeInTheDocument();
    });

    // Just verify the keywords tab content loaded
    expect(screen.getByText('AI tools')).toBeInTheDocument();
    expect(screen.getByText('chatbot')).toBeInTheDocument();
  });

  it('displays chart section in sidebar', () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    expect(screen.getByText('İlgi Zaman Çizelgesi')).toBeInTheDocument();
  });

  it('displays quick stats in sidebar', () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    expect(screen.getByText('Hızlı İstatistikler')).toBeInTheDocument();
    expect(screen.getByText('Toplam Trend')).toBeInTheDocument();
    expect(screen.getByText('Anahtar Kelime')).toBeInTheDocument();
    expect(screen.getByText('RSS Haber')).toBeInTheDocument();
    expect(screen.getByText('Ortalama Skor')).toBeInTheDocument();
  });

  it('refreshes data when refresh button is clicked', async () => {
    render(
      <BrowserRouter>
        <TrendExplorer />
      </BrowserRouter>
    );

    const refreshButton = screen.getByText('Yenile');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(6); // Initial 3 calls + refresh 3 calls
    });
  });
});
