import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from '../pages/Settings';
import api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings page with tabs', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ayarlar' })).toBeInTheDocument();
    });

    // Check tabs are present
    expect(screen.getByRole('tab', { name: 'Genel' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'API Anahtarları' })).toBeInTheDocument();
  });

  it('displays API Keys tab by default', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'API Anahtarları' })).toBeInTheDocument();
    });
  });

  it('loads and displays API keys from settings', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        openai_api_key: '********',
        unsplash_api_key: 'unsplash-key-456',
        google_trends_api_key: 'trends-key-789',
        search_console_client_id: 'client-id-abc',
        search_console_client_secret: 'client-secret-def',
        search_console_refresh_token: 'refresh-token-ghi',
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
    });

    // Check that inputs are present (they should be password fields by default)
    const openaiInput = screen.getByLabelText('OpenAI API Key') as HTMLInputElement;
    expect(openaiInput.type).toBe('password');
  });

  it('toggles password visibility for API key inputs', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
    });

    const openaiInput = screen.getByLabelText('OpenAI API Key') as HTMLInputElement;
    const toggleButton = screen.getAllByRole('button', { name: /show|hide/i })[0];

    // Initially password type
    expect(openaiInput.type).toBe('password');

    // Click to show
    fireEvent.click(toggleButton);
    expect(openaiInput.type).toBe('text');

    // Click to hide again
    fireEvent.click(toggleButton);
    expect(openaiInput.type).toBe('password');
  });

  it('saves API key when save button is clicked', async () => {
    mockApi.get.mockResolvedValue({ data: {} });
    mockApi.put.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
    });

    // Enter a value
    const openaiInput = screen.getByLabelText('OpenAI API Key');
    fireEvent.change(openaiInput, { target: { value: '********' } });

    // Click save button for OpenAI
    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/settings/openai_api_key', {
        value: '********',
        type: 'string',
      });
    });
  });

  it('displays all API key input fields', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
    });

    // Check all API key fields are present
    expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Unsplash API Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Google Trends API Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Search Console Client ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Search Console Client Secret')).toBeInTheDocument();
    expect(screen.getByLabelText('Search Console Refresh Token')).toBeInTheDocument();
  });

  it('disables save button when no changes made', async () => {
    mockApi.get.mockResolvedValue({
      data: { openai_api_key: 'existing-key' },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
    });

    // Save button should be disabled initially (no changes)
    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    expect(saveButtons[0]).toBeDisabled();
  });

  it('enables save button when value changes', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
    });

    const openaiInput = screen.getByLabelText('OpenAI API Key');
    fireEvent.change(openaiInput, { target: { value: 'new-value' } });

    // Save button should now be enabled
    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    expect(saveButtons[0]).not.toBeDisabled();
  });

  it('switches between tabs', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Genel' })).toBeInTheDocument();
    });

    // Click General tab
    fireEvent.click(screen.getByRole('tab', { name: 'Genel' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Genel Ayarlar' })).toBeInTheDocument();
    });

    // Click API Keys tab
    fireEvent.click(screen.getByRole('tab', { name: 'API Anahtarları' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'API Anahtarları' })).toBeInTheDocument();
    });
  });

  it('displays security note in API keys tab', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Güvenlik Notu')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/API anahtarları sunucuda güvenli bir şekilde saklanır/i)
    ).toBeInTheDocument();
  });

  it('shows loading state while fetching settings', async () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows saved indicator after successful save', async () => {
    mockApi.get.mockResolvedValue({ data: {} });
    mockApi.put.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
    });

    // Enter a value and save
    const openaiInput = screen.getByLabelText('OpenAI API Key');
    fireEvent.change(openaiInput, { target: { value: '********' } });

    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Kaydedildi')).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Ayarlar yüklenirken bir hata oluştu/i)).toBeInTheDocument();
    });
  });
});
