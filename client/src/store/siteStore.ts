import { create } from 'zustand';
import api from '../services/api';

export interface Site {
  id: number;
  name: string;
  domain: string;
  platform: 'blogger' | 'wordpress';
  platform_id: string;
  api_credentials: any;
  language: string;
  niche: string;
  adsense_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SiteState {
  sites: Site[];
  isLoading: boolean;
  fetchSites: () => Promise<void>;
  createSite: (data: Partial<Site>) => Promise<void>;
  updateSite: (id: number, data: Partial<Site>) => Promise<void>;
  deleteSite: (id: number) => Promise<void>;
}

export const useSiteStore = create<SiteState>((set, get) => ({
  sites: [],
  isLoading: false,

  fetchSites: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/sites');
      set({ sites: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createSite: async (siteData) => {
    const { data } = await api.post('/sites', siteData);
    set({ sites: [...get().sites, data] });
  },

  updateSite: async (id, siteData) => {
    const { data } = await api.put(`/sites/${id}`, siteData);
    set({ sites: get().sites.map((s) => (s.id === id ? data : s)) });
  },

  deleteSite: async (id) => {
    await api.delete(`/sites/${id}`);
    set({ sites: get().sites.filter((s) => s.id !== id) });
  },
}));
