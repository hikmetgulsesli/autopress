import { useMemo } from 'react';
import { Search, FileText, Clock, Hash } from 'lucide-react';

interface SEOPanelProps {
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onSlugChange: (value: string) => void;
}

export function SEOPanel({
  title,
  content,
  metaTitle,
  metaDescription,
  slug,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onSlugChange,
}: SEOPanelProps) {
  // Calculate word count from title and content
  const wordCount = useMemo(() => {
    const text = `${title} ${content}`.trim();
    if (!text) return 0;
    const words = text.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }, [title, content]);

  // Calculate reading time (average 200 words per minute)
  const readingTime = useMemo(() => {
    if (wordCount === 0) return 0;
    return Math.ceil(wordCount / 200);
  }, [wordCount]);

  // Auto-generate slug from title if slug is empty
  const handleTitleChange = (value: string) => {
    onMetaTitleChange(value);
    // Auto-generate slug if slug is empty
    if (!slug) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      onSlugChange(generatedSlug);
    }
  };

  return (
    <div className="space-y-4">
      {/* SEO Panel Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <Search className="w-5 h-5 text-primary-400" style={{ color: 'var(--color-primary-400)' }} />
        <h3 className="font-semibold text-text">SEO Ayarları</h3>
      </div>

      {/* Meta Title */}
      <div className="space-y-2">
        <label htmlFor="meta-title" className="block text-sm font-medium text-text">
          Meta Başlık
        </label>
        <input
          id="meta-title"
          type="text"
          value={metaTitle}
          onChange={(e) => onMetaTitleChange(e.target.value)}
          placeholder="SEO için başlık girin..."
          maxLength={60}
          className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200"
        />
        <div className="text-xs text-text-muted text-right">
          {metaTitle.length}/60
        </div>
      </div>

      {/* Meta Description */}
      <div className="space-y-2">
        <label htmlFor="meta-description" className="block text-sm font-medium text-text">
          Meta Açıklama
        </label>
        <textarea
          id="meta-description"
          value={metaDescription}
          onChange={(e) => onMetaDescriptionChange(e.target.value)}
          placeholder="SEO için açıklama girin..."
          maxLength={160}
          rows={3}
          className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200 resize-none"
        />
        <div className="text-xs text-text-muted text-right">
          {metaDescription.length}/160
        </div>
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <label htmlFor="slug" className="block text-sm font-medium text-text">
          URL Slug
        </label>
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-sm">/blog/</span>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="url-slug"
            className="flex-1 px-3 py-2 bg-surface-alt border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="pt-4 border-t border-border space-y-3">
        {/* Word Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-muted">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Kelime Sayısı</span>
          </div>
          <span className="text-sm font-medium text-text">{wordCount}</span>
        </div>

        {/* Reading Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-muted">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Okuma Süresi</span>
          </div>
          <span className="text-sm font-medium text-text">
            {readingTime} {readingTime === 1 ? 'dakika' : 'dakika'}
          </span>
        </div>
      </div>
    </div>
  );
}
