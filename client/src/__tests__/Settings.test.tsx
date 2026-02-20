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

  it('displays General tab by default', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Genel Ayarlar' })).toBeInTheDocument();
    });
  });

  it('loads and displays general settings from API', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        language: 'en',
        ai_model: 'gpt-4o',
        publish_jitter_minutes: 30,
        seo_min_words: 500,
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Varsayılan Dil')).toBeInTheDocument();
    });

    // Check language dropdown is present and has correct value
    const languageSelect = screen.getByLabelText('Varsayılan Dil') as HTMLSelectElement;
    expect(languageSelect.value).toBe('en');
  });

  it('loads AI model from settings', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        ai_model: 'claude-3-5-sonnet',
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('AI Model')).toBeInTheDocument();
    });

    const aiModelSelect = screen.getByLabelText('AI Model') as HTMLSelectElement;
    expect(aiModelSelect.value).toBe('claude-3-5-sonnet');
  });

  it('loads publish jitter from settings', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        publish_jitter_minutes: 45,
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Yayın Jitter Süresi (dakika)')).toBeInTheDocument();
    });

    const jitterInput = screen.getByLabelText('Yayın Jitter Süresi (dakika)') as HTMLInputElement;
    expect(jitterInput.value).toBe('45');
  });

  it('loads SEO min words from settings', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        seo_min_words: 600,
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('SEO Minimum Kelime Sayısı')).toBeInTheDocument();
    });

    const seoInput = screen.getByLabelText('SEO Minimum Kelime Sayısı') as HTMLInputElement;
    expect(seoInput.value).toBe('600');
  });

  it('saves language setting', async () => {
    mockApi.get.mockResolvedValue({ data: {} });
    mockApi.put.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Varsayılan Dil')).toBeInTheDocument();
    });

    // Change language
    const languageSelect = screen.getByLabelText('Varsayılan Dil');
    fireEvent.change(languageSelect, { target: { value: 'en' } });

    // Find and click save button for language
    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/settings/language', {
        value: 'en',
        type: 'string',
      });
    });
  });

  it('saves AI model setting', async () => {
    mockApi.get.mockResolvedValue({ data: {} });
    mockApi.put.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('AI Model')).toBeInTheDocument();
    });

    // Change AI model
    const aiModelSelect = screen.getByLabelText('AI Model');
    fireEvent.change(aiModelSelect, { target: { value: 'gpt-3.5-turbo' } });

    // Find and click save button for AI model
    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    fireEvent.click(saveButtons[1]);

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/settings/ai_model', {
        value: 'gpt-3.5-turbo',
        type: 'string',
      });
    });
  });

  it('saves publish jitter setting', async () => {
    mockApi.get.mockResolvedValue({ data: {} });
    mockApi.put.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Yayın Jitter Süresi (dakika)')).toBeInTheDocument();
    });

    // Change jitter
    const jitterInput = screen.getByLabelText('Yayın Jitter Süresi (dakika)');
    fireEvent.change(jitterInput, { target: { value: '20' } });

    // Find and click save button for jitter
    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    fireEvent.click(saveButtons[2]);

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/settings/publish_jitter_minutes', {
        value: 20,
        type: 'number',
      });
    });
  });

  it('saves SEO min words setting', async () => {
    mockApi.get.mockResolvedValue({ data: {} });
    mockApi.put.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('SEO Minimum Kelime Sayısı')).toBeInTheDocument();
    });

    // Change SEO min words
    const seoInput = screen.getByLabelText('SEO Minimum Kelime Sayısı');
    fireEvent.change(seoInput, { target: { value: '400' } });

    // Find and click save button for SEO min words
    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    fireEvent.click(saveButtons[3]);

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/settings/seo_min_words', {
        value: 400,
        type: 'number',
      });
    });
  });

  it('displays all language options', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Varsayılan Dil')).toBeInTheDocument();
    });

    const languageSelect = screen.getByLabelText('Varsayılan Dil') as HTMLSelectElement;
    const options = languageSelect.options;
    
    // Check that expected languages are present
    const optionTexts = Array.from(options).map(o => o.text);
    expect(optionTexts).toContain('Türkçe');
    expect(optionTexts).toContain('English');
    expect(optionTexts).toContain('Deutsch');
  });

  it('displays all AI model options', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('AI Model')).toBeInTheDocument();
    });

    const aiModelSelect = screen.getByLabelText('AI Model') as HTMLSelectElement;
    const options = aiModelSelect.options;
    
    // Check that expected models are present
    const optionTexts = Array.from(options).map(o => o.text);
    expect(optionTexts).toContain('GPT-4o (OpenAI)');
    expect(optionTexts).toContain('GPT-4o Mini (OpenAI)');
    expect(optionTexts).toContain('Claude 3.5 Sonnet (Anthropic)');
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
      expect(screen.getByLabelText('Varsayılan Dil')).toBeInTheDocument();
    });

    // Change language and save
    const languageSelect = screen.getByLabelText('Varsayılan Dil');
    fireEvent.change(languageSelect, { target: { value: 'en' } });

    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Kaydedildi')).toBeInTheDocument();
    });
  });

  it('disables save button when no changes made', async () => {
    mockApi.get.mockResolvedValue({
      data: { 
        language: 'tr',
        ai_model: 'gpt-4o',
        publish_jitter_minutes: 15,
        seo_min_words: 300,
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Varsayılan Dil')).toBeInTheDocument();
    });

    // All save buttons should be disabled initially (no changes)
    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    saveButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('enables save button when value changes', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Varsayılan Dil')).toBeInTheDocument();
    });

    // Change language
    const languageSelect = screen.getByLabelText('Varsayılan Dil');
    fireEvent.change(languageSelect, { target: { value: 'en' } });

    // First save button should now be enabled
    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    expect(saveButtons[0]).not.toBeDisabled();
  });

  it('switches between General and API Keys tabs', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'API Anahtarları' })).toBeInTheDocument();
    });

    // Click API Keys tab
    fireEvent.click(screen.getByRole('tab', { name: 'API Anahtarları' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'API Anahtarları' })).toBeInTheDocument();
    });

    // Click General tab
    fireEvent.click(screen.getByRole('tab', { name: 'Genel' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Genel Ayarlar' })).toBeInTheDocument();
    });
  });

  // API Keys Tab Tests
  it('loads and displays API keys from settings', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        openai_api_key: 'sk-test123',
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

    // Switch to API Keys tab
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'API Anahtarları' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('tab', { name: 'API Anahtarları' }));

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

    // Switch to API Keys tab
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'API Anahtarları' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('tab', { name: 'API Anahtarları' }));

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

    // Switch to API Keys tab first
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'API Anahtarları' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('tab', { name: 'API Anahtarları' }));

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
    });

    // Enter a value
    const openaiInput = screen.getByLabelText('OpenAI API Key');
    fireEvent.change(openaiInput, { target: { value: 'sk-new-api-key' } });

    // Click save button for OpenAI (first API key save button)
    const saveButtons = screen.getAllByRole('button', { name: /kaydet/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/settings/openai_api_key', {
        value: 'sk-new-api-key',
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

    // Switch to API Keys tab
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'API Anahtarları' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('tab', { name: 'API Anahtarları' }));

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

  it('displays security note in API keys tab', async () => {
    mockApi.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    // Switch to API Keys tab
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'API Anahtarları' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('tab', { name: 'API Anahtarları' }));

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
