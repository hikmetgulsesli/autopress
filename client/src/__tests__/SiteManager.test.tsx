import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SiteManager from '../pages/SiteManager';
import api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the site store - need to mock the actual implementation
const mockTestConnection = vi.fn();

vi.mock('../store/siteStore', () => ({
  useSiteStore: vi.fn((selector) => {
    const state = {
      sites: [
        {
          id: 1,
          name: 'Test Blog',
          domain: 'testblog.com',
          platform: 'blogger' as const,
          platform_id: '123456',
          api_credentials: { api_key: 'test-key' },
          language: 'tr',
          niche: 'technology',
          adsense_status: 'pending',
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ],
      isLoading: false,
      fetchSites: vi.fn().mockResolvedValue(undefined),
      createSite: vi.fn(),
      updateSite: vi.fn(),
      deleteSite: vi.fn(),
      testConnection: mockTestConnection,
    };
    return selector ? selector(state) : state;
  }),
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('SiteManager - Test Connection Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders test connection button for each site', async () => {
    render(
      <MemoryRouter>
        <SiteManager />
      </MemoryRouter>
    );

    // Wait for the component to render sites
    await waitFor(() => {
      expect(screen.getByText('Test Blog')).toBeInTheDocument();
    });

    // Find test connection button by text content
    const testButton = screen.getByText('Bağlantıyı Test Et');
    expect(testButton).toBeInTheDocument();
  });

  it('shows loading spinner during connection test', async () => {
    // Make testConnection never resolve to simulate loading
    mockTestConnection.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <SiteManager />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Blog')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Bağlantıyı Test Et');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(testButton.closest('button')).toBeDisabled();
    });
  });

  it('displays success message on valid credentials', async () => {
    mockTestConnection.mockResolvedValueOnce({
      success: true,
      message: 'Bağlantı başarılı! Site erişimi doğrulandı.',
      platform: 'blogger',
      tested_at: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <SiteManager />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Blog')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Bağlantıyı Test Et');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Bağlantı başarılı/i);
    });
  });

  it('displays error message on invalid credentials', async () => {
    mockTestConnection.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Geçersiz kimlik bilgileri. Lütfen API anahtarınızı kontrol edin.',
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <SiteManager />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Blog')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Bağlantıyı Test Et');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Geçersiz kimlik bilgileri/i);
    });
  });

  it('displays error message when platform ID is missing', async () => {
    mockTestConnection.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'MISSING_PLATFORM_ID',
            message: 'Platform ID eksik. Lütfen site ayarlarından platform ID ekleyin.',
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <SiteManager />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Blog')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Bağlantıyı Test Et');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Platform ID eksik/i);
    });
  });

  it('displays error message when API credentials are missing', async () => {
    mockTestConnection.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'API kimlik bilgileri eksik. Lütfen site ayarlarından API bilgilerini ekleyin.',
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <SiteManager />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Blog')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Bağlantıyı Test Et');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/API kimlik bilgileri eksik/i);
    });
  });

  it('button has proper accessibility attributes', async () => {
    render(
      <MemoryRouter>
        <SiteManager />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Blog')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Bağlantıyı Test Et');
    expect(testButton.closest('button')).toHaveAttribute('aria-label');
  });
});
