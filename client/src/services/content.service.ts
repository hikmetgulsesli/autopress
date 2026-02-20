import api from './api';
import type { Article } from '../types';

export interface ContentGenerationRequest {
  topic: string;
  contentType: 'blog' | 'listicle' | 'howto' | 'faq';
  language: 'TR' | 'EN' | 'DE' | 'FR' | 'ES' | 'AR';
  wordCount: number;
  keywords?: string[];
}

export interface ContentGenerationResponse {
  title: string;
  slug: string;
  excerpt: string;
  metaDescription: string;
  content: string;
  headings: { h1: string; h2: string[]; h3: string[] };
  jsonLd?: object;
}

export interface CreateArticleRequest {
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

export interface UpdateArticleRequest extends Partial<CreateArticleRequest> {}

export const contentService = {
  // Generate content using AI
  generateContent: async (data: ContentGenerationRequest): Promise<ContentGenerationResponse> => {
    const response = await api.post('/content/generate', data);
    return response.data.data;
  },

  // Create a new article
  createArticle: async (data: CreateArticleRequest): Promise<Article> => {
    const response = await api.post('/articles', data);
    return response.data;
  },

  // Update an existing article
  updateArticle: async (id: number, data: UpdateArticleRequest): Promise<Article> => {
    const response = await api.put(`/articles/${id}`, data);
    return response.data;
  },

  // Get a single article
  getArticle: async (id: number): Promise<Article> => {
    const response = await api.get(`/articles/${id}`);
    return response.data;
  },

  // Get all articles with optional filters
  getArticles: async (params?: {
    site_id?: number;
    status?: string;
    language?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Article[]; total: number; page: number; limit: number }> => {
    const response = await api.get('/articles', { params });
    return response.data;
  },
};

export default contentService;
