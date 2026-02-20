import { create } from 'zustand';
import api from '../services/api';

interface SettingsState {
  settings: Record<string, string | number | boolean>;
  isLoading: boolean;
  error: string | null;
  hasChanges: boolean;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: string | number | boolean) => void;
  saveSettings: () => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  isLoading: false,
  error: null,
  hasChanges: false,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/settings');
      set({ settings: response.data, isLoading: false });
    } catch (err: any) {
      set({ 
        error: err.response?.data?.error || 'Ayarlar yüklenirken bir hata oluştu', 
        isLoading: false 
      });
    }
  },

  updateSetting: (key: string, value: string | number | boolean) => {
    set((state) => ({
      settings: { ...state.settings, [key]: value },
      hasChanges: true,
    }));
  },

  saveSettings: async () => {
    const { settings } = get();
    set({ isLoading: true, error: null });
    
    try {
      // Save each setting individually via PUT /api/settings/:key
      const promises = Object.entries(settings).map(([key, value]) => {
        const type = typeof value === 'number' ? 'number' : 
                     typeof value === 'boolean' ? 'boolean' : 'string';
        return api.put(`/settings/${key}`, { value, type });
      });
      
      await Promise.all(promises);
      set({ isLoading: false, hasChanges: false });
      return true;
    } catch (err: any) {
      set({ 
        error: err.response?.data?.error || 'Ayarlar kaydedilirken bir hata oluştu', 
        isLoading: false 
      });
      return false;
    }
  },
}));
