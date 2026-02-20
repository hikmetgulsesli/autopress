import { useState, useEffect, useCallback } from 'react';
import { FileText, Calendar, BarChart3, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../services/api';
import type { Article } from '../types';

interface ArticleListProps {
  selectedArticleId?: number | null;
  onSelectArticle: (article: Article) => void;
  refreshTrigger?: number;
}

export function ArticleList({ selectedArticleId, onSelectArticle, refreshTrigger = 0 }: ArticleListProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/articles?limit=50');
      setArticles(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Makaleler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <span className="text-sm">Makaleler yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <AlertCircle className="w-8 h-8 text-error mb-3" />
        <span className="text-sm text-center px-4">{error}</span>
        <button
          type="button"
          onClick={fetchArticles}
          className="mt-4 text-sm text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <FileText className="w-12 h-12 mb-4 opacity-50" />
        <h4 className="text-text font-medium mb-1">Henüz makale yok</h4>
        <p className="text-sm text-center px-4">
          İlk makalenizi oluşturmak için İçerik Stüdyosu&apos;nu kullanın.
        </p>
      </div>
    );
  }

  return (
    <div 
      className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
      role="listbox"
      aria-label="Makale listesi"
    >
      {articles.map((article) => (
        <button
          key={article.id}
          type="button"
          onClick={() => onSelectArticle(article)}
          className={`
            w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer
            focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface
            ${selectedArticleId === article.id
              ? 'bg-primary-400/10 border-primary-400/50 shadow-sm' 
              : 'bg-surface-alt border-border hover:border-primary-400/30 hover:bg-surface-elevated'
            }
          `}
          aria-selected={selectedArticleId === article.id}
          role="option"
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-text text-sm line-clamp-2 flex-1" title={article.title}>
              {article.title}
            </h4>
            <ChevronRight 
              className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${selectedArticleId === article.id ? 'text-primary-400 translate-x-0.5' : 'text-text-muted'}`} 
            />
          </div>
          
          <div className="flex items-center gap-3 mt-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
              article.status === 'published' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              article.status === 'scheduled' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
              article.status === 'review' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
              'bg-slate-500/20 text-slate-400 border-slate-500/30'
            }`}>
              {article.status === 'published' ? 'Yayında' :
               article.status === 'scheduled' ? 'Planlandı' :
               article.status === 'review' ? 'İncelemede' : 'Taslak'}
            </span>
            
            <div className="flex items-center gap-1 text-text-muted">
              <Calendar className="w-3 h-3" />
              <span className="text-xs">
                {format(new Date(article.created_at), 'd MMM', { locale: tr })}
              </span>
            </div>
            
            <div className={`flex items-center gap-1 ${
              article.seo_score >= 80 ? 'text-emerald-400' :
              article.seo_score >= 60 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              <BarChart3 className="w-3 h-3" />
              <span className="text-xs font-medium">
                {article.seo_score}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export default ArticleList;
