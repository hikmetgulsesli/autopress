import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { Article } from '../types';

interface UseArticleListResult {
  articles: Article[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseArticleListOptions {
  siteId?: number;
  status?: Article['status'];
  language?: string;
  limit?: number;
}

export function useArticleList(options: UseArticleListOptions = {}): UseArticleListResult {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.siteId) params.append('site_id', String(options.siteId));
      if (options.status) params.append('status', options.status);
      if (options.language) params.append('language', options.language);
      if (options.limit) params.append('limit', String(options.limit));

      const response = await api.get(`/articles?${params.toString()}`);
      setArticles(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Makaleler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [options.siteId, options.status, options.language, options.limit]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return { articles, isLoading, error, refresh: fetchArticles };
}
