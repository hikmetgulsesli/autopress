import { useState, useEffect } from 'react';
import { Sparkles, Save, Eye, FileText, Loader2, Image as ImageIcon, Tag, Globe, CheckCircle } from 'lucide-react';
import TipTapEditor from '../components/content/TipTapEditor';
import SEOPreviewPanel from '../components/content/SEOPreviewPanel';
import contentService from '../services/content.service';
import { slugify } from '../utils/slugify';
import type { Article } from '../types';

interface Category {
  id: number;
  name: string;
}

interface ContentStudioProps {
  articleId?: number;
  onSave?: (article: Article) => void;
}

export default function ContentStudio({ articleId, onSave }: ContentStudioProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [siteId, setSiteId] = useState<number | undefined>(undefined);
  const [language, setLanguage] = useState('tr');
  const [status, setStatus] = useState<'draft' | 'review' | 'scheduled' | 'published'>('draft');

  // UI state
  const [activeTab, setActiveTab] = useState<'write' | 'preview' | 'seo'>('write');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites] = useState<{ id: number; name: string }[]>([
    { id: 1, name: 'Blog Sitem' },
    { id: 2, name: 'Haber Portalı' },
  ]);
  const [categories] = useState<Category[]>([
    { id: 1, name: 'Teknoloji' },
    { id: 2, name: 'Sağlık' },
    { id: 3, name: 'Finans' },
    { id: 4, name: 'Eğitim' },
    { id: 5, name: 'Seyahat' },
    { id: 6, name: 'Yaşam' },
  ]);

  // Load article if editing
  useEffect(() => {
    if (articleId) {
      loadArticle(articleId);
    }
  }, [articleId]);

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !slug) {
      setSlug(slugify(title));
    }
  }, [title, slug]);

  const loadArticle = async (id: number) => {
    try {
      const article = await contentService.getArticle(id);
      setTitle(article.title);
      setContent(article.content);
      setMetaDescription(article.meta_description || '');
      setSlug(article.slug);
      setExcerpt(article.excerpt || '');
      setFeaturedImageUrl(article.featured_image_url || '');
      setSiteId(article.site_id);
      setLanguage(article.language);
      setStatus(article.status);
    } catch (err) {
      setError('Makale yüklenirken bir hata oluştu');
    }
  };

  const handleGenerateContent = async () => {
    if (!title) {
      setError('Lütfen önce bir başlık girin');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await contentService.generateContent({
        topic: title,
        contentType: 'blog',
        language: language.toUpperCase() as 'TR' | 'EN' | 'DE' | 'FR' | 'ES' | 'AR',
        wordCount: 1000,
      });

      setContent(result.content);
      setMetaDescription(result.metaDescription);
      setSlug(result.slug);
      setExcerpt(result.excerpt);
    } catch (err: any) {
      setError(err.message || 'İçerik oluşturulurken bir hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title || !content) {
      setError('Başlık ve içerik zorunludur');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const articleData = {
        site_id: siteId,
        title,
        content,
        excerpt: excerpt || metaDescription.slice(0, 200),
        status,
        language,
        meta_title: title,
        meta_description: metaDescription,
        featured_image_url: featuredImageUrl,
        ai_model: 'gpt-4o',
      };

      let savedArticle: Article;
      if (articleId) {
        savedArticle = await contentService.updateArticle(articleId, articleData);
      } else {
        savedArticle = await contentService.createArticle(articleData);
      }

      setSaveSuccess(true);
      onSave?.(savedArticle);

      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Kaydedilirken bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(slugify(value));
  };

  // Character counters
  const titleChars = title.length;
  const metaChars = metaDescription.length;
  const excerptChars = excerpt.length;

  // Get tab button classes
  const getTabClass = (tabName: 'write' | 'preview' | 'seo') => {
    const isActive = activeTab === tabName;
    return `flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
      isActive
        ? 'text-primary-400 border-primary-400'
        : 'text-text-muted border-transparent hover:text-text'
    }`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">İçerik Stüdyosu</h1>
          <p className="text-text-muted mt-1">AI ile SEO uyumlu içerik üretin</p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-emerald-500 text-sm">
              <CheckCircle className="w-4 h-4" />
              Kaydedildi
            </span>
          )}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'write' ? 'preview' : 'write')}
            className="btn btn-ghost"
          >
            <Eye className="w-4 h-4" />
            {activeTab === 'write' ? 'Önizleme' : 'Düzenle'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Kaydet
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-500 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title Input */}
          <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-2">
            <label htmlFor="title" className="block text-sm font-medium text-text">
              Başlık <span className="text-rose-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Başlık girin..."
              className="w-full bg-transparent text-xl font-bold text-text placeholder:text-text-muted focus:outline-none"
            />
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>SEO için ideal: 50-60 karakter</span>
              <span className={titleChars > 60 ? 'text-rose-500' : 'text-emerald-500'}>
                {titleChars} / 60
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('write')}
              className={getTabClass('write')}
            >
              <FileText className="w-4 h-4" />
              Yaz
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={getTabClass('preview')}
            >
              <Eye className="w-4 h-4" />
              Önizleme
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('seo')}
              className={getTabClass('seo')}
            >
              <Globe className="w-4 h-4" />
              SEO
            </button>
          </div>

          {/* Editor / Preview */}
          {activeTab === 'write' && (
            <TipTapEditor
              content={content}
              onChange={setContent}
              placeholder="İçeriğinizi buraya yazın..."
            />
          )}

          {activeTab === 'preview' && (
            <div
              className="bg-surface-alt border border-border rounded-xl p-6 min-h-[400px] prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: content || '<p class="text-text-muted">İçerik henüz yok</p>',
              }}
            />
          )}

          {activeTab === 'seo' && (
            <div className="space-y-4">
              {/* SEO Fields */}
              <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-medium text-text">SEO Ayarları</h3>

                {/* Meta Description */}
                <div className="space-y-2">
                  <label htmlFor="meta-description" className="block text-sm text-text-muted">
                    Meta Açıklama
                  </label>
                  <textarea
                    id="meta-description"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="SEO meta açıklaması..."
                    rows={3}
                    className="input resize-none"
                  />
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Google SERP'de görünen açıklama</span>
                    <span className={metaChars > 160 ? 'text-rose-500' : 'text-emerald-500'}>
                      {metaChars} / 160
                    </span>
                  </div>
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <label htmlFor="slug" className="block text-sm text-text-muted">
                    URL Slug
                  </label>
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="url-dostu-slug"
                    className="input font-mono text-sm"
                  />
                </div>

                {/* Excerpt */}
                <div className="space-y-2">
                  <label htmlFor="excerpt" className="block text-sm text-text-muted">
                    Özet
                  </label>
                  <textarea
                    id="excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Makale özeti..."
                    rows={2}
                    className="input resize-none"
                  />
                  <div className="text-xs text-text-muted text-right">
                    {excerptChars} / 200
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Generate Section */}
          <div className="bg-surface-alt border border-border rounded-xl p-4">
            <button
              type="button"
              onClick={handleGenerateContent}
              disabled={isGenerating}
              className="flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isGenerating ? 'İçerik oluşturuluyor...' : 'AI ile içerik üret'}
              </span>
            </button>
            <p className="text-xs text-text-muted mt-2">
              Başlığa göre AI otomatik olarak içerik, meta açıklama ve slug oluşturacak.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO Preview Panel */}
          <SEOPreviewPanel
            title={title}
            metaDescription={metaDescription}
            slug={slug}
            url="example.com"
          />

          {/* Article Settings */}
          <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-medium text-text flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Makale Ayarları
            </h3>

            {/* Site Selection */}
            <div className="space-y-2">
              <label htmlFor="site" className="block text-sm text-text-muted">
                Site
              </label>
              <select
                id="site"
                value={siteId || ''}
                onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : undefined)}
                className="input"
              >
                <option value="">Site seçin</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <label htmlFor="category" className="block text-sm text-text-muted">
                Kategori
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input"
              >
                <option value="">Kategori seçin</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label htmlFor="language" className="block text-sm text-text-muted">
                Dil
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            {/* Status Selection */}
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm text-text-muted">
                Durum
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="input"
              >
                <option value="draft">Taslak</option>
                <option value="review">İncelemede</option>
                <option value="scheduled">Planlandı</option>
                <option value="published">Yayında</option>
              </select>
            </div>

            {/* Featured Image URL */}
            <div className="space-y-2">
              <label htmlFor="featured-image" className="block text-sm text-text-muted flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                Öne Çıkan Görsel URL
              </label>
              <input
                id="featured-image"
                type="url"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
