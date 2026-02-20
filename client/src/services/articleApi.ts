import api from './api';
import type { Article } from '../types';

export interface CreateArticleInput {
  site_id?: number;
  title: string;
  content: string;
  excerpt?: string;
  status?: 'draft' | 'review' | 'scheduled' | 'published';
  language?: string;
  meta_title?: string;
  meta_description?: string;
  featured_image_url?: string;
  ai_model?: string;
  source_trend_id?: number;
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {}

export interface ArticleListResponse {
  data: Article[];
  total: number;
  page: number;
  limit: number;
}

export interface ArticleFilters {
  site_id?: number;
  status?: string;
  language?: string;
  page?: number;
  limit?: number;
}

export const articleApi = {
  async list(filters: ArticleFilters = {}): Promise<ArticleListResponse> {
    const params = new URLSearchParams();
    if (filters.site_id) params.append('site_id', String(filters.site_id));
    if (filters.status) params.append('status', filters.status);
    if (filters.language) params.append('language', filters.language);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const query = params.toString();
    const url = query ? `/articles?${query}` : '/articles';
    const response = await api.get(url);
    return response.data;
  },

  async get(id: number): Promise<Article> {
    const response = await api.get(`/articles/${id}`);
    return response.data;
  },

  async create(data: CreateArticleInput): Promise<Article> {
    const response = await api.post('/articles', data);
    return response.data;
  },

  async update(id: number, data: UpdateArticleInput): Promise<Article> {
    const response = await api.put(`/articles/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/articles/${id}`);
  },

  async save(data: CreateArticleInput & { id?: number }): Promise<Article> {
    if (data.id) {
      const { id, ...updateData } = data;
      return this.update(id, updateData);
    }
    return this.create(data);
  },
};

export default articleApi;
