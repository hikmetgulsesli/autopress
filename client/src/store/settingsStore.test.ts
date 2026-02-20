import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from './settingsStore';
import api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store state
    useSettingsStore.setState({
      settings: {},
      isLoading: false,
      error: null,
      hasChanges: false,
    });
    vi.clearAllMocks();
  });

  describe('fetchSettings', () => {
    it('fetches settings from API and updates state', async () => {
      const mockSettings = {
        default_language: 'tr',
        default_ai_model: 'gpt-4o',
        publish_jitter_minutes: 15,
        seo_min_word_count: 800,
      };
      
      (api.get as any).mockResolvedValueOnce({ data: mockSettings });
      
      await useSettingsStore.getState().fetchSettings();
      
      expect(api.get).toHaveBeenCalledWith('/settings');
      expect(useSettingsStore.getState().settings).toEqual(mockSettings);
      expect(useSettingsStore.getState().isLoading).toBe(false);
      expect(useSettingsStore.getState().error).toBeNull();
    });

    it('handles fetch error', async () => {
      const errorMessage = 'Network error';
      (api.get as any).mockRejectedValueOnce({ 
        response: { data: { error: errorMessage } } 
      });
      
      await useSettingsStore.getState().fetchSettings();
      
      expect(useSettingsStore.getState().error).toBe(errorMessage);
      expect(useSettingsStore.getState().isLoading).toBe(false);
    });

    it('sets loading state while fetching', async () => {
      (api.get as any).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      useSettingsStore.getState().fetchSettings();
      
      expect(useSettingsStore.getState().isLoading).toBe(true);
    });
  });

  describe('updateSetting', () => {
    it('updates a setting value', () => {
      useSettingsStore.getState().updateSetting('default_language', 'en');
      
      expect(useSettingsStore.getState().settings.default_language).toBe('en');
      expect(useSettingsStore.getState().hasChanges).toBe(true);
    });

    it('updates multiple settings', () => {
      useSettingsStore.getState().updateSetting('default_language', 'en');
      useSettingsStore.getState().updateSetting('publish_jitter_minutes', 30);
      
      expect(useSettingsStore.getState().settings.default_language).toBe('en');
      expect(useSettingsStore.getState().settings.publish_jitter_minutes).toBe(30);
      expect(useSettingsStore.getState().hasChanges).toBe(true);
    });

    it('preserves existing settings when updating', () => {
      useSettingsStore.setState({
        settings: { default_ai_model: 'gpt-4o' },
      });
      
      useSettingsStore.getState().updateSetting('default_language', 'en');
      
      expect(useSettingsStore.getState().settings.default_ai_model).toBe('gpt-4o');
      expect(useSettingsStore.getState().settings.default_language).toBe('en');
    });
  });

  describe('saveSettings', () => {
    it('saves all settings via PUT /api/settings/:key', async () => {
      useSettingsStore.setState({
        settings: {
          default_language: 'en',
          default_ai_model: 'gpt-4',
          publish_jitter_minutes: 30,
          seo_min_word_count: 1000,
        },
      });
      
      (api.put as any).mockResolvedValue({ data: {} });
      
      const result = await useSettingsStore.getState().saveSettings();
      
      expect(result).toBe(true);
      expect(api.put).toHaveBeenCalledTimes(4);
      expect(api.put).toHaveBeenCalledWith('/settings/default_language', { 
        value: 'en', 
        type: 'string' 
      });
      expect(api.put).toHaveBeenCalledWith('/settings/default_ai_model', { 
        value: 'gpt-4', 
        type: 'string' 
      });
      expect(api.put).toHaveBeenCalledWith('/settings/publish_jitter_minutes', { 
        value: 30, 
        type: 'number' 
      });
      expect(api.put).toHaveBeenCalledWith('/settings/seo_min_word_count', { 
        value: 1000, 
        type: 'number' 
      });
      expect(useSettingsStore.getState().hasChanges).toBe(false);
    });

    it('returns false and sets error on save failure', async () => {
      useSettingsStore.setState({
        settings: { default_language: 'en' },
      });
      
      const errorMessage = 'Save failed';
      (api.put as any).mockRejectedValueOnce({
        response: { data: { error: errorMessage } },
      });
      
      const result = await useSettingsStore.getState().saveSettings();
      
      expect(result).toBe(false);
      expect(useSettingsStore.getState().error).toBe(errorMessage);
      expect(useSettingsStore.getState().isLoading).toBe(false);
    });

    it('sets loading state while saving', async () => {
      useSettingsStore.setState({
        settings: { default_language: 'en' },
      });
      
      (api.put as any).mockImplementation(() => new Promise((resolve) => {
        setTimeout(resolve, 100);
      }));
      
      const savePromise = useSettingsStore.getState().saveSettings();
      expect(useSettingsStore.getState().isLoading).toBe(true);
      
      await savePromise;
    });

    it('handles boolean settings correctly', async () => {
      useSettingsStore.setState({
        settings: { auto_publish: true },
      });
      
      (api.put as any).mockResolvedValue({ data: {} });
      
      await useSettingsStore.getState().saveSettings();
      
      expect(api.put).toHaveBeenCalledWith('/settings/auto_publish', { 
        value: true, 
        type: 'boolean' 
      });
    });
  });
});
