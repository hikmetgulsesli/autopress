import { useState } from 'react';
import { PenTool, Sparkles, Save, Eye, Image as ImageIcon, X } from 'lucide-react';
import { TipTapEditor } from '../components/TipTapEditor';
import ImageSearch from '../components/ImageSearch';
import ImageAttribution from '../components/ImageAttribution';
import type { ImageSearchResult } from '../types';

export default function ContentStudio() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<ImageSearchResult | null>(null);
  const [showImageSearch, setShowImageSearch] = useState(false);

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
          <h1 className="text-2xl font-bold text-white">İçerik Stüdyosu</h1>
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
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary-400 text-surface hover:bg-primary-500 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isNewArticle ? 'Kaydet' : 'Güncelle'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title Input */}
          <div className="space-y-2">
            <label htmlFor="article-title" className="block text-sm font-medium text-text">
              Başlık *
            </label>
            <input
              id="article-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Makale başlığını girin..."
              className="w-full px-4 py-3 bg-surface-alt border border-border rounded-xl text-text text-lg font-medium placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200"
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text">
              İçerik *
            </label>
            {isPreview ? (
              <div 
                className="border border-border rounded-xl overflow-hidden bg-surface-alt min-h-[300px] px-4 py-3 prose prose-invert prose-zinc max-w-none"
                dangerouslySetInnerHTML={{ __html: formData.content }}
              />
            ) : (
              <TipTapEditor
                content={formData.content}
                onChange={(value) => handleChange('content', value)}
                placeholder="Makale içeriğini yazmaya başlayın..."
              />
            )}
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <label htmlFor="article-excerpt" className="block text-sm font-medium text-text">
              Özet
            </label>
            <textarea
              id="article-excerpt"
              value={formData.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              placeholder="Makale özeti girin (opsiyonel)"
              rows={3}
              className="w-full px-4 py-3 bg-surface-alt border border-border rounded-xl text-text placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200 resize-none"
            />
          </div>

          {/* Meta Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="meta-title" className="block text-sm font-medium text-text">
                Meta Başlık
              </label>
              <input
                id="meta-title"
                type="text"
                value={formData.meta_title}
                onChange={(e) => handleChange('meta_title', e.target.value)}
                placeholder="SEO meta başlığı"
                className="w-full px-4 py-3 bg-surface-alt border border-border rounded-xl text-text placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="meta-description" className="block text-sm font-medium text-text">
                Meta Açıklama
              </label>
              <input
                id="meta-description"
                type="text"
                value={formData.meta_description}
                onChange={(e) => handleChange('meta_description', e.target.value)}
                placeholder="SEO meta açıklaması"
                className="w-full px-4 py-3 bg-surface-alt border border-border rounded-xl text-text placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-4">
          {/* Status & Language */}
          <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-4"
            style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
          >
            <div className="space-y-2">
              <label htmlFor="article-status" className="block text-sm font-medium text-text">
                Durum
              </label>
              <select
                id="article-status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text cursor-pointer focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <option value="draft">Taslak</option>
                <option value="review">İncelemede</option>
                <option value="scheduled">Planlandı</option>
                <option value="published">Yayınlandı</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="article-language" className="block text-sm font-medium text-text">
                Dil
              </label>
              <select
                id="article-language"
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text cursor-pointer focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>

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

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
