import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, BarChart3, Loader2, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Article } from '../types';
import clsx from 'clsx';

interface ArticleListProps {
  articles: Article[];
  isLoading?: boolean;
  onRefresh?: () => void;
  selectedArticleId?: number | null;
}

const statusLabels: Record<Article['status'], string> = {
  draft: 'Taslak',
  review: 'İnceleme',
  scheduled: 'Planlı',
  published: 'Yayınlandı',
};

const statusColors: Record<Article['status'], string> = {
  draft: 'bg-zinc-600 text-zinc-200',
  review: 'bg-amber-600/20 text-amber-400',
  scheduled: 'bg-blue-600/20 text-blue-400',
  published: 'bg-emerald-600/20 text-emerald-400',
};

function getSeoScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function getSeoScoreLabel(score: number): string {
  if (score >= 80) return 'İyi';
  if (score >= 60) return 'Orta';
  return 'Düşük';
}

export function ArticleList({ articles, isLoading = false, selectedArticleId }: ArticleListProps) {
  const navigate = useNavigate();

  const handleArticleClick = (articleId: number) => {
    navigate(`/content?article=${articleId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-primary-400 animate-spin" style={{ color: 'var(--color-primary-400)' }} />
        <span className="ml-2 text-sm text-text-muted">Makaleler yükleniyor...</span>
      </div>
    );
  }

  // Empty state
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center mb-3"
          style={{ backgroundColor: 'var(--color-surface-alt)' }}
        >
          <Inbox className="w-6 h-6 text-text-muted" style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <p className="text-sm text-text-muted">Henüz makale yok</p>
        <p className="text-xs text-text-subtle mt-1">İçerik Stüdyosu'nda yeni bir makale oluşturun</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {articles.map((article) => (
        <button
          key={article.id}
          onClick={() => handleArticleClick(article.id)}
          className={clsx(
            'w-full text-left p-3 rounded-lg transition-all duration-200 cursor-pointer',
            'border',
            selectedArticleId === article.id
              ? 'bg-primary-400/10 border-primary-400/50'
              : 'bg-transparent border-transparent hover:bg-surface-alt hover:border-border'
          )}
          style={{
            backgroundColor: selectedArticleId === article.id ? 'rgba(34, 211, 238, 0.1)' : undefined,
            borderColor: selectedArticleId === article.id ? 'rgba(34, 211, 238, 0.5)' : undefined,
          }}
        >
          {/* Title */}
          <div className="flex items-start gap-2 mb-2">
            <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-text-muted" style={{ color: 'var(--color-text-muted)' }} />
            <h4 className="text-sm font-medium text-text line-clamp-2 flex-1">
              {article.title || 'Başlıksız'}
            </h4>
          </div>

          {/* Meta info row */}
          <div className="flex items-center justify-between mt-2">
            {/* Status badge */}
            <span className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              statusColors[article.status]
            )}>
              {statusLabels[article.status]}
            </span>

            {/* SEO Score */}
            <div className="flex items-center gap-1">
              <BarChart3 className={clsx('w-3.5 h-3.5', getSeoScoreColor(article.seo_score))} 
                style={{ color: article.seo_score >= 80 ? 'var(--color-success)' : article.seo_score >= 60 ? 'var(--color-warning)' : 'var(--color-error)' }}
              />
              <span className={clsx('text-xs font-medium', getSeoScoreColor(article.seo_score))}
                style={{ color: article.seo_score >= 80 ? 'var(--color-success)' : article.seo_score >= 60 ? 'var(--color-warning)' : 'var(--color-error)' }}
              >
                {article.seo_score}
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-text-subtle">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {article.updated_at 
                ? format(new Date(article.updated_at), 'd MMM yyyy', { locale: tr })
                : '-'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

interface ArticleListPanelProps {
  selectedArticleId?: number | null;
}

export function ArticleListPanel({ selectedArticleId }: ArticleListPanelProps) {
  const { articles, isLoading, error, refresh } = useArticleList({ limit: 20 });
  
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">Son Makaleler</h3>
        <button
          onClick={refresh}
          className="text-xs text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
          style={{ color: 'var(--color-primary-400)' }}
          aria-label="Refresh articles"
        >
          Yenile
        </button>
      </div>
      
      {error && (
        <div className="text-sm text-error p-3 bg-error/10 rounded-lg mb-2">
          {error}
        </div>
      )}
      
      <ArticleList 
        articles={articles} 
        isLoading={isLoading}
        selectedArticleId={selectedArticleId}
      />
    </div>
  );
}
