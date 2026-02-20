import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PenTool, Sparkles, Save, Eye, Image as ImageIcon, X, Loader2, AlertCircle } from 'lucide-react';
import { TipTapEditor } from '../components/TipTapEditor';
import ImageSearch from '../components/ImageSearch';
import ImageAttribution from '../components/ImageAttribution';
import api from '../services/api';
import type { ImageSearchResult, Article } from '../types';

export default function ContentStudio() {
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('article');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<ImageSearchResult | null>(null);
  const [showImageSearch, setShowImageSearch] = useState(false);
  
  // Article loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedArticle, setLoadedArticle] = useState<Article | null>(null);

  // Fetch article from URL param
  useEffect(() => {
    if (!articleId) return;

    const fetchArticle = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await api.get<Article>(`/articles/${articleId}`);
        const article = response.data;
        
        setLoadedArticle(article);
        setTitle(article.title || '');
        setContent(article.content || '');
        
        // Set featured image if available
        if (article.featured_image_url) {
          setFeaturedImage({
            id: String(article.id),
            url: article.featured_image_url,
            thumbUrl: article.featured_image_url,
            description: null,
            altDescription: null,
            width: 0,
            height: 0,
            photographer: { name: '', username: '', portfolioUrl: '' },
            color: null,
          });
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Makale bulunamadı');
        } else {
          setError(err.response?.data?.error || 'Makale yüklenirken bir hata oluştu');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  const handleSave = () => {
    // TODO: Save article to backend
    console.log('Saving article:', { title, content, featuredImage });
  };

  const handleSelectImage = (image: ImageSearchResult) => {
    setFeaturedImage(image);
    setShowImageSearch(false);
  };

  const handleRemoveImage = () => {
    setFeaturedImage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {loadedArticle ? 'Makale Düzenle' : 'İçerik Stüdyosu'}
          </h1>
          <p className="text-dark-400 mt-1">AI ile SEO uyumlu içerik üretin</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              transition-all duration-200 cursor-pointer
              ${isPreview 
                ? 'bg-primary-400/20 text-primary-400' 
                : 'bg-surface-alt text-text-muted hover:text-text hover:bg-surface-elevated'
              }
              focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface
            `}
          >
            <Eye className="w-4 h-4" />
            {isPreview ? 'Düzenle' : 'Önizleme'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary-400 text-surface hover:bg-primary-500 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" style={{ color: 'var(--color-primary-400)' }} />
          <span className="ml-3 text-text-muted">Makale yükleniyor...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/30 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0" style={{ color: '#ef4444' }} />
          <div>
            <p className="font-medium text-error" style={{ color: '#ef4444' }}>Hata</p>
            <p className="text-text-muted text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Content - hide when loading or error */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title Input */}
          <div className="space-y-2">
            <label htmlFor="article-title" className="block text-sm font-medium text-text">
              Başlık
            </label>
            <input
              id="article-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Makale başlığını girin..."
              className="w-full px-4 py-3 bg-surface-alt border border-border rounded-xl text-text text-lg font-medium placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200"
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text">
              İçerik
            </label>
            {isPreview ? (
              <div 
                className="border border-border rounded-xl overflow-hidden bg-surface-alt min-h-[300px] px-4 py-3 prose prose-invert prose-zinc max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <TipTapEditor
                key={articleId}
                content={content}
                onChange={setContent}
                placeholder="Makale içeriğini yazmaya başlayın..."
              />
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-4">
          {/* Featured Image Card */}
          <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-4"
            style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary-400" style={{ color: 'var(--color-primary-400)' }} />
                <h3 className="font-semibold text-text">Öne Çıkan Görsel</h3>
              </div>
              {featuredImage && (
                <button
                  onClick={handleRemoveImage}
                  className="text-text-muted hover:text-error transition-colors p-1 rounded-lg hover:bg-error/10"
                  aria-label="Remove featured image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {featuredImage ? (
              <div className="space-y-3">
                <div className="aspect-video rounded-lg overflow-hidden bg-surface"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <img
                    src={featuredImage.url}
                    alt={featuredImage.altDescription || featuredImage.description || 'Featured image'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <ImageAttribution image={featuredImage} />
              </div>
            ) : (
              <button
                onClick={() => setShowImageSearch(!showImageSearch)}
                className="w-full py-8 border-2 border-dashed border-border rounded-lg text-text-muted hover:text-text hover:border-primary-400/50 transition-all duration-200 flex flex-col items-center gap-2 cursor-pointer"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ImageIcon className="w-8 h-8" />
                <span className="text-sm font-medium">Görsel Seç</span>
                <span className="text-xs">Unsplash'tan ara</span>
              </button>
            )}

            {/* Image Search Panel */}
            {showImageSearch && !featuredImage && (
              <div className="pt-4 border-t border-border"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-text">Görsel Ara</span>
                  <button
                    onClick={() => setShowImageSearch(false)}
                    className="text-text-muted hover:text-text transition-colors p-1"
                    aria-label="Close image search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ImageSearch 
                  onSelect={handleSelectImage}
                />
              </div>
            )}
          </div>

          {/* AI Assistant Card */}
          <div className="bg-surface-alt border border-border rounded-xl p-4"
            style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-accent-400/10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(var(--color-accent-400-rgb, 163, 230, 53), 0.1)' }}
              >
                <Sparkles className="w-5 h-5 text-accent-400" style={{ color: 'var(--color-accent-400)' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text">AI Asistan</h3>
                <p className="text-text-muted text-sm mt-1">
                  Yapay zeka ile içerik önerileri alın.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface text-text-muted hover:text-text hover:bg-surface-elevated transition-all duration-200 cursor-pointer border border-border"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <PenTool className="w-3 h-3" />
                    Başlık Öner
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface text-text-muted hover:text-text hover:bg-surface-elevated transition-all duration-200 cursor-pointer border border-border"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <Sparkles className="w-3 h-3" />
                    SEO Analizi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
