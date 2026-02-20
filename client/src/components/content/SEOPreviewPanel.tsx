import { Globe, AlertCircle, CheckCircle } from 'lucide-react';

interface SEOPreviewPanelProps {
  title: string;
  metaDescription: string;
  slug: string;
  url?: string;
}

export default function SEOPreviewPanel({
  title,
  metaDescription,
  slug,
  url = 'example.com',
}: SEOPreviewPanelProps) {
  // SEO limits
  const TITLE_MAX = 60;
  const META_MAX = 160;

  // Calculate lengths
  const titleLength = title.length;
  const metaLength = metaDescription.length;

  // Determine status
  const titleStatus = titleLength === 0 ? 'empty' : titleLength > TITLE_MAX ? 'too-long' : 'optimal';
  const metaStatus = metaLength === 0 ? 'empty' : metaLength > META_MAX ? 'too-long' : 'optimal';

  // Truncate for preview
  const displayTitle = title || 'Başlık yok';
  const displayMeta = metaDescription || 'Meta açıklama yok';

  // Get status classes
  const getTitleCountClass = () => {
    if (titleStatus === 'too-long') return 'font-medium tabular-nums text-rose-500';
    if (titleStatus === 'empty') return 'font-medium tabular-nums text-amber-500';
    return 'font-medium tabular-nums text-emerald-500';
  };

  const getMetaCountClass = () => {
    if (metaStatus === 'too-long') return 'font-medium tabular-nums text-rose-500';
    if (metaStatus === 'empty') return 'font-medium tabular-nums text-amber-500';
    return 'font-medium tabular-nums text-emerald-500';
  };

  const getTitleBarClass = () => {
    if (titleStatus === 'optimal') return 'h-full transition-all duration-200 bg-emerald-500';
    if (titleStatus === 'empty') return 'h-full transition-all duration-200 bg-amber-500';
    return 'h-full transition-all duration-200 bg-rose-500';
  };

  const getMetaBarClass = () => {
    if (metaStatus === 'optimal') return 'h-full transition-all duration-200 bg-emerald-500';
    if (metaStatus === 'empty') return 'h-full transition-all duration-200 bg-amber-500';
    return 'h-full transition-all duration-200 bg-rose-500';
  };

  return (
    <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-surface flex items-center gap-2">
        <Globe className="w-4 h-4 text-text-muted" />
        <h3 className="text-sm font-medium text-text">Google SERP Önizleme</h3>
      </div>

      {/* Google Preview */}
      <div className="p-4 bg-white">
        <div className="max-w-[600px]">
          {/* URL */}
          <div className="flex items-center gap-1 text-sm mb-1">
            <span className="text-[#202124] truncate">{url}</span>
            <span className="text-[#5f6368]">› ... ›</span>
            <span className="text-[#5f6368] truncate">{slug || 'slug-buraya'}</span>
          </div>

          {/* Title */}
          <h3
            className="text-[#1a0dab] text-xl font-normal leading-tight mb-1 hover:underline cursor-pointer truncate"
            style={{ color: '#1a0dab' }}
          >
            {displayTitle.length > TITLE_MAX ? displayTitle.slice(0, TITLE_MAX) + '...' : displayTitle}
          </h3>

          {/* Meta Description */}
          <p className="text-[#4d5156] text-sm leading-[1.58] line-clamp-2">
            {displayMeta.length > META_MAX ? displayMeta.slice(0, META_MAX) + '...' : displayMeta}
          </p>
        </div>
      </div>

      {/* SEO Metrics */}
      <div className="px-4 py-3 border-t border-border space-y-3">
        {/* Title Counter */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted flex items-center gap-1">
              Başlık
              {titleStatus === 'optimal' ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              )}
            </span>
            <span className={getTitleCountClass()}>
              {titleLength} / {TITLE_MAX}
            </span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className={getTitleBarClass()}
              style={{ width: `${Math.min((titleLength / TITLE_MAX) * 100, 100)}%` }}
            />
          </div>
          {titleStatus === 'too-long' && (
            <p className="text-xs text-rose-500">Başlık çok uzun, kısaltmanız önerilir</p>
          )}
          {titleStatus === 'empty' && (
            <p className="text-xs text-amber-500">Başlık boş bırakılamaz</p>
          )}
        </div>

        {/* Meta Description Counter */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted flex items-center gap-1">
              Meta Açıklama
              {metaStatus === 'optimal' ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              )}
            </span>
            <span className={getMetaCountClass()}>
              {metaLength} / {META_MAX}
            </span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className={getMetaBarClass()}
              style={{ width: `${Math.min((metaLength / META_MAX) * 100, 100)}%` }}
            />
          </div>
          {metaStatus === 'too-long' && (
            <p className="text-xs text-rose-500">Meta açıklama çok uzun, kısaltmanız önerilir</p>
          )}
          {metaStatus === 'empty' && (
            <p className="text-xs text-amber-500">Meta açıklama SEO için önemlidir</p>
          )}
        </div>

        {/* Slug Preview */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">URL Slug</span>
            <span className="text-text font-mono text-xs truncate max-w-[200px]">
              {slug || 'otomatik-olusturulacak'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
