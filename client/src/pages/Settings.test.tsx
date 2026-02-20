import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Settings from '../pages/Settings';
import * as settingsStore from '../store/settingsStore';

// Mock the settings store
const mockFetchSettings = vi.fn();
const mockUpdateSetting = vi.fn();
const mockSaveSettings = vi.fn();

vi.mock('../store/settingsStore', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      settings: {
        default_language: 'tr',
        default_ai_model: 'gpt-4o',
        publish_jitter_minutes: 15,
        seo_min_word_count: 800,
      },
      isLoading: false,
      error: null,
      hasChanges: false,
      fetchSettings: mockFetchSettings,
      updateSetting: mockUpdateSetting,
      saveSettings: mockSaveSettings,
    };
    return selector ? selector(state) : state;
  }),
}));

describe('Settings Page - General Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveSettings.mockResolvedValue(true);
  });

  it('renders settings page with General tab active', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    expect(screen.getByText('Ayarlar')).toBeInTheDocument();
    expect(screen.getByText('Platform ayarlarını yönetin')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /settings tabs/i })).toBeInTheDocument();
  });

  it('displays default language dropdown with TR and EN options', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const languageSelect = screen.getByLabelText(/varsayılan dil/i);
    expect(languageSelect).toBeInTheDocument();
    expect(screen.getByText('Türkçe')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('displays AI model dropdown with GPT-4o, GPT-4 options', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const aiModelSelect = screen.getByLabelText(/varsayılan ai modeli/i);
    expect(aiModelSelect).toBeInTheDocument();
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
    expect(screen.getByText('GPT-4 Turbo')).toBeInTheDocument();
    expect(screen.getByText('GPT-3.5 Turbo')).toBeInTheDocument();
  });

  it('displays jitter duration input (minutes)', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const jitterInput = screen.getByLabelText(/yayınlama jitter süresi/i);
    expect(jitterInput).toBeInTheDocument();
    expect(jitterInput).toHaveAttribute('type', 'number');
    expect(jitterInput).toHaveAttribute('min', '0');
    expect(jitterInput).toHaveAttribute('max', '120');
  });

  it('displays SEO min word count input', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const wordCountInput = screen.getByLabelText(/seo minimum kelime sayısı/i);
    expect(wordCountInput).toBeInTheDocument();
    expect(wordCountInput).toHaveAttribute('type', 'number');
    expect(wordCountInput).toHaveAttribute('min', '100');
    expect(wordCountInput).toHaveAttribute('max', '5000');
  });

  it('calls updateSetting when language is changed', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const languageSelect = screen.getByLabelText(/varsayılan dil/i);
    fireEvent.change(languageSelect, { target: { value: 'en' } });
    
    expect(mockUpdateSetting).toHaveBeenCalledWith('default_language', 'en');
  });

  it('calls updateSetting when AI model is changed', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const aiModelSelect = screen.getByLabelText(/varsayılan ai modeli/i);
    fireEvent.change(aiModelSelect, { target: { value: 'gpt-4' } });
    
    expect(mockUpdateSetting).toHaveBeenCalledWith('default_ai_model', 'gpt-4');
  });

  it('calls updateSetting when jitter duration is changed', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const jitterInput = screen.getByLabelText(/yayınlama jitter süresi/i);
    fireEvent.change(jitterInput, { target: { value: '30' } });
    
    expect(mockUpdateSetting).toHaveBeenCalledWith('publish_jitter_minutes', 30);
  });

  it('calls updateSetting when SEO word count is changed', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const wordCountInput = screen.getByLabelText(/seo minimum kelime sayısı/i);
    fireEvent.change(wordCountInput, { target: { value: '1000' } });
    
    expect(mockUpdateSetting).toHaveBeenCalledWith('seo_min_word_count', 1000);
  });

  it('calls saveSettings when save button is clicked', async () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const saveButton = screen.getByRole('button', { name: /kaydet/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalled();
    });
  });

  it('shows success message after saving', async () => {
    mockSaveSettings.mockResolvedValueOnce(true);
    
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const saveButton = screen.getByRole('button', { name: /kaydet/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Ayarlar kaydedildi')).toBeInTheDocument();
    });
  });

  it('fetches settings on mount', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    expect(mockFetchSettings).toHaveBeenCalled();
  });

  it('renders all tabs', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /genel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ai/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /yayınlama/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bildirimler/i })).toBeInTheDocument();
  });

  it('switches tabs when clicked', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const aiTab = screen.getByRole('button', { name: /ai/i });
    fireEvent.click(aiTab);
    
    expect(screen.getByText('AI Ayarları')).toBeInTheDocument();
    expect(screen.getByText('Yakında')).toBeInTheDocument();
  });
});
