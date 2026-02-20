import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Publisher from '../pages/Publisher';
import api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

// Mock react-big-calendar
vi.mock('react-big-calendar', () => ({
  Calendar: () => <div data-testid="calendar-mock">Calendar Mock</div>,
  dateFnsLocalizer: () => ({}),
}));

// Mock toast
vi.mock('../utils/toast.tsx', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Publisher Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display error message when queue API fails', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    // Mock API to return error for queue
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/publish/queue') {
        return Promise.reject({
          response: {
            data: {
              error: {
                code: 'DATABASE_ERROR',
                message: 'Yayın kuyruğu alınırken bir hata oluştu',
              },
            },
          },
        });
      }
      if (url === '/publish/history') {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === '/articles?status=draft') {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === '/sites') {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByText('Yayın kuyruğu alınırken bir hata oluştu')).toBeInTheDocument();
    });
  });

  it('should display error message when history API fails', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/publish/queue') {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === '/publish/history') {
        return Promise.reject({
          response: {
            data: {
              error: {
                code: 'DATABASE_ERROR',
                message: 'Yayın geçmişi alınırken bir hata oluştu',
              },
            },
          },
        });
      }
      if (url === '/articles?status=draft') {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === '/sites') {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByText('Yayın geçmişi alınırken bir hata oluştu')).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    mockedApi.get.mockImplementation(() => {
      return Promise.reject(new Error('Network Error'));
    });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });

  it('should show retry button when error occurs', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    mockedApi.get.mockImplementation(() => {
      return Promise.reject(new Error('Network Error'));
    });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tekrar dene/i })).toBeInTheDocument();
    });
  });

  it('should handle empty queue response', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    mockedApi.get.mockResolvedValue({ data: { data: [] } });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByText('Henüz zamanlanmış yayın yok')).toBeInTheDocument();
    });
  });

  it('should handle empty history response', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    mockedApi.get.mockResolvedValue({ data: { data: [] } });

    render(<Publisher />);

    // Switch to history tab
    const historyTab = screen.getByRole('button', { name: /geçmiş/i });
    await userEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('Henüz yayın geçmişi yok')).toBeInTheDocument();
    });
  });

  it('should handle legacy API response format (direct array)', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    const mockQueueItem = {
      id: 1,
      site_id: 1,
      title: 'Test Article',
      slug: 'test-article',
      excerpt: 'Test excerpt',
      status: 'scheduled',
      platform: 'wordpress',
      scheduled_at: '2024-01-15T10:00:00Z',
      site_name: 'Test Site',
    };

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/publish/queue') {
        // Return legacy format (direct array)
        return Promise.resolve({ data: [mockQueueItem] });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });
  });

  it('should handle malformed API response', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/publish/queue') {
        // Return malformed response
        return Promise.resolve({ data: null });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByText('Henüz zamanlanmış yayın yok')).toBeInTheDocument();
    });
  });

  it('should display error banner when API fails', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    mockedApi.get.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Veritabanı bağlantı hatası',
          },
        },
      },
    });

    render(<Publisher />);

    await waitFor(() => {
      const errorBanner = screen.getByText('Veritabanı bağlantı hatası');
      expect(errorBanner).toBeInTheDocument();
    });
  });

  it('should handle schedule cancellation error', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };

    const mockQueueItem = {
      id: 1,
      site_id: 1,
      title: 'Test Article',
      slug: 'test-article',
      excerpt: 'Test excerpt',
      status: 'scheduled',
      platform: 'wordpress',
      scheduled_at: '2024-01-15T10:00:00Z',
      site_name: 'Test Site',
    };

    mockedApi.get.mockResolvedValue({ data: { data: [mockQueueItem] } });
    mockedApi.delete.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'CANCEL_ERROR',
            message: 'Zamanlama iptal edilirken bir hata oluştu',
          },
        },
      },
    });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });

    // Mock confirm dialog
    vi.stubGlobal('confirm', () => true);

    const cancelButton = screen.getByRole('button', { name: /iptal et/i });
    await userEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith('/publish/schedule/1');
    });
  });
});

describe('Publisher API Response Format', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle new API format with data wrapper', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    const mockQueueItem = {
      id: 1,
      site_id: 1,
      title: 'New Format Article',
      slug: 'new-format-article',
      excerpt: 'Test excerpt',
      status: 'scheduled',
      platform: 'wordpress',
      scheduled_at: '2024-01-15T10:00:00Z',
      site_name: 'Test Site',
    };

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/publish/queue') {
        return Promise.resolve({ data: { data: [mockQueueItem] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByText('New Format Article')).toBeInTheDocument();
    });
  });

  it('should handle queue items with missing optional fields', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    const mockQueueItem = {
      id: 1,
      site_id: 1,
      title: null, // Missing title
      slug: 'test-article',
      excerpt: null, // Missing excerpt
      status: 'scheduled',
      platform: 'wordpress',
      scheduled_at: null, // Missing scheduled_at
      site_name: null, // Missing site_name
    };

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/publish/queue') {
        return Promise.resolve({ data: { data: [mockQueueItem] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByText('Başlıksız Makale')).toBeInTheDocument();
      expect(screen.getByText('Site atanmamış')).toBeInTheDocument();
      expect(screen.getByText('Tarih atanmamış')).toBeInTheDocument();
    });
  });

  it('should handle history items with missing optional fields', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    const mockHistoryItem = {
      id: 1,
      article_id: 1,
      site_id: 1,
      platform: 'wordpress',
      platform_post_id: '123',
      status: 'success',
      published_at: null, // Missing published_at
      article_title: null, // Missing article_title
      site_name: null, // Missing site_name
    };

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/publish/history') {
        return Promise.resolve({ data: { data: [mockHistoryItem] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<Publisher />);

    // Switch to history tab
    const historyTab = screen.getByRole('button', { name: /geçmiş/i });
    await userEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('Bilinmeyen makale')).toBeInTheDocument();
    });
  });
});

describe('Publisher Empty States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show empty state for queue when no items', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    mockedApi.get.mockResolvedValue({ data: { data: [] } });

    render(<Publisher />);

    await waitFor(() => {
      expect(screen.getByText('Henüz zamanlanmış yayın yok')).toBeInTheDocument();
      expect(screen.getByText('İlk Yayını Zamanla')).toBeInTheDocument();
    });
  });

  it('should show empty state for history when no items', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    mockedApi.get.mockResolvedValue({ data: { data: [] } });

    render(<Publisher />);

    // Switch to history tab
    const historyTab = screen.getByRole('button', { name: /geçmiş/i });
    await userEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('Henüz yayın geçmişi yok')).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching', async () => {
    const mockedApi = api as unknown as {
      get: ReturnType<typeof vi.fn>;
    };

    // Delay the response
    mockedApi.get.mockImplementation(() => new Promise(() => {}));

    render(<Publisher />);

    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
  });
});
