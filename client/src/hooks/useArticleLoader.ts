import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import type { Article } from '../types';

interface UseArticleLoaderResult {
  article: Article | null;
  isLoading: boolean;
  error: string | null;
}

export function useArticleLoader(): UseArticleLoaderResult {
  const [searchParams] = useSearchParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const articleId = searchParams.get('article');

    if (!articleId) {
      setArticle(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const fetchArticle = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get(`/articles/${articleId}`);
        setArticle(response.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Makale bulunamadı');
        } else {
          setError(err.response?.data?.error || 'Makale yüklenirken bir hata oluştu');
        }
        setArticle(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [searchParams]);

  return { article, isLoading, error };
}
