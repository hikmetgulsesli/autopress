import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  Save, 
  Eye, 
  Loader2, 
  FileText, 
  Image as ImageIcon,
  Globe,
  AlertCircle,
  CheckCircle,
  Wand2
} from 'lucide-react';
import TipTapEditor from '../components/content/TipTapEditor';
import SEOPreviewPanel from '../components/content/SEOPreviewPanel';
import { contentService, ContentGenerationRequest } from '../services/content.service';
import { slugify } from '../utils/slugify';
import type { Article } from '../types';

// Form field component for consistent styling
interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
}

function FormField({ label, children, error, hint, required }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text">
        {label}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-sm text-text-muted">{hint}</p>
      )}
    </div>
  );
}

// Character counter component
interface CharacterCounterProps {
  current: number;
  max: number;
  label: string;
}

function CharacterCounter({ current, max, label }: CharacterCounterProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const isOverLimit = current > max;
  const isNearLimit = current > max * 0.9 && !isOverLimit;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className={`tabular-nums font-medium ${
          isOverLimit ? 'text-rose-400' : isNearLimit ? 'text-amber-400' : 'text-text-muted'
        }`}>
          {current} / {max}
        </span>
      </div>
      <div className="h-1 bg-surface rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-200 ${
            isOverLimit ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-primary-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// AI Generation Modal
interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: ContentGenerationRequest) => void;
  isGenerating: boolean;
}

function AIGenerationModal({ isOpen, onClose, onGenerate, isGenerating }: AIGenerationModalProps) {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState<ContentGenerationRequest['contentType']>('blog');
  const [language, setLanguage] = useState<ContentGenerationRequest['language']>('TR');
  const [wordCount, setWordCount] = useState(1000);
  const [keywords, setKeywords] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      topic,
      contentType,
      language,
      wordCount,
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-alt border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-400/10 rounded-lg flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">AI İçerik Üret</h2>
              <p className="text-sm text-text-muted">Yapay zeka ile SEO uyumlu içerik oluşturun</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormField label="Konu" required>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Örn: Dijital pazarlama stratejileri"
              className="input"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="İçerik Türü">
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentGenerationRequest['contentType'])}
                className="input"
              >
                <option value="blog">Blog Yazısı</option>
                <option value="listicle">Liste Makalesi</option>
                <option value="howto">Nasıl Yapılır</option>
                <option value="faq">SSS</option>
              </select>
            </FormField>

            <FormField label="Dil">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as ContentGenerationRequest['language'])}
                className="input"
              >
                <option value="TR">Türkçe</option>
                <option value="EN">English</option>
                <option value="DE">Deutsch</option>
                <option value="FR">Français</option>
                <option value="ES">Español</option>
                <option value="AR">العربية</option>
              </select>
            </FormField>
          </div>

          <FormField label="Kelime Sayısı" hint="800-2000 kelime arası">
            <input
              type="range"
              min="800"
              max="2000"
              step="100"
              value={wordCount}
              onChange={(e) => setWordCount(Number(e.target.value))}
              className="w-full accent-primary-400"
            />
            <div className="text-center text-sm text-text-muted mt-1">{wordCount} kelime</div>
          </FormField>

          <FormField label="Anahtar Kelimeler" hint="Virgülle ayırın">
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="pazarlama, seo, dijital..."
              className="input"
            />
          </FormField>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={isGenerating}
            >
              İptal
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isGenerating || !topic.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Üretiliyor...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  İçerik Üret
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main ContentStudio component
export default function ContentStudio() {
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('id');

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [status, setStatus] = useState<Article['status']>('draft');
  const [language, setLanguage] = useState('TR');
  const [siteId, setSiteId] = useState<number | undefined>(undefined);

  // UI state
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !slug) {
      setSlug(slugify(title));
    }
  }, [title, slug]);

  // Load article if editing
  useEffect(() => {
    if (articleId) {
      loadArticle(Number(articleId));
    }
  }, [articleId]);

  const loadArticle = async (id: number) => {
    try {
      const article = await contentService.getArticle(id);
      setTitle(article.title);
      setContent(article.content);
      setMetaDescription(article.meta_description || '');
      setSlug(article.slug);
      setExcerpt(article.excerpt || '');
      setFeaturedImageUrl(article.featured_image_url || '');
      setStatus(article.status);
      setLanguage(article.language);
      setSiteId(article.site_id);
    } catch (err) {
      console.error('Failed to load article:', err);
    }
  };

  const handleAIGenerate = async (data: ContentGenerationRequest) => {
    setIsAIGenerating(true);
    try {
      const generated = await contentService.generateContent(data);
      setTitle(generated.title);
      setContent(generated.content);
      setMetaDescription(generated.metaDescription);
      setSlug(generated.slug);
      setExcerpt(generated.excerpt);
      setShowAIModal(false);
    } catch (err: any) {
      setErrors({ ai: err.message || 'İçerik üretimi başarısız oldu' });
    } finally {
      setIsAIGenerating(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Başlık gereklidir';
    }
    if (!content.trim()) {
      newErrors.content = 'İçerik gereklidir';
    }
    if (title.length > 60) {
      newErrors.title = 'Başlık 60 karakterden uzun olmamalıdır';
    }
    if (metaDescription.length > 160) {
      newErrors.metaDescription = 'Meta açıklama 160 karakterden uzun olmamalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (saveStatus: Article['status'] = status) => {
    if (!validateForm()) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const articleData = {
        site_id: siteId,
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || metaDescription.trim().slice(0, 200),
        status: saveStatus,
        language,
        meta_title: title.trim(),
        meta_description: metaDescription.trim(),
        featured_image_url: featuredImageUrl.trim() || undefined,
        ai_model: 'gpt-4o',
      };

      if (articleId) {
        await contentService.updateArticle(Number(articleId), articleData);
      } else {
        await contentService.createArticle(articleData);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Kaydetme başarısız oldu' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">İçerik Stüdyosu</h1>
          <p className="text-text-muted mt-1">AI ile SEO uyumlu içerik üretin ve düzenleyin</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAIModal(true)}
            className="btn btn-accent"
            disabled={isAIGenerating}
          >
            <Sparkles className="w-4 h-4" />
            AI Üret
          </button>
          <button
            onClick={() => handleSave('draft')}
            className="btn btn-ghost"
            disabled={isSaving}
          >
            <Save className="w-4 h-4" />
            Taslak Kaydet
          </button>
          <button
            onClick={() => handleSave('review')}
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {articleId ? 'Güncelle' : 'Yayınla'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-400">Makale başarıyla kaydedildi!</span>
        </div>
      )}

      {errors.submit && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span className="text-rose-400">{errors.submit}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="card space-y-4">
            <FormField label="Başlık" error={errors.title} required>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Makale başlığını girin"
                className="input text-lg"
              />
            </FormField>
            <CharacterCounter current={title.length} max={60} label="Başlık Uzunluğu" />
          </div>

          {/* Content Editor */}
          <div className="card space-y-4">
            <FormField label="İçerik" error={errors.content} required>
              <TipTapEditor
                content={content}
                onChange={setContent}
                placeholder="Makale içeriğini yazmaya başlayın..."
              />
            </FormField>
          </div>

          {/* SEO Fields */}
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-text flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-400" />
              SEO Ayarları
            </h3>

            <FormField label="Meta Açıklama" error={errors.metaDescription}>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Arama sonuçlarında görünecek açıklama"
                rows={3}
                className="input resize-none"
              />
            </FormField>
            <CharacterCounter current={metaDescription.length} max={160} label="Meta Açıklama Uzunluğu" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="URL Slug">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-dostu-slug"
                  className="input font-mono text-sm"
                />
              </FormField>

              <FormField label="Kategori">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Kategori seçin"
                  className="input"
                />
              </FormField>
            </div>

            <FormField label="Özet" hint="Makalenin kısa özeti (isteğe bağlı)">
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Makalenin kısa bir özeti"
                rows={2}
                className="input resize-none"
              />
            </FormField>
          </div>

          {/* Featured Image */}
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-text flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary-400" />
              Öne Çıkan Görsel
            </h3>
            <FormField label="Görsel URL">
              <input
                type="url"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="input"
              />
            </FormField>
            {featuredImageUrl && (
              <div className="mt-4 rounded-lg overflow-hidden border border-border">
                <img
                  src={featuredImageUrl}
                  alt="Öne çıkan görsel önizleme"
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO Preview */}
          <SEOPreviewPanel
            title={title}
            metaDescription={metaDescription}
            slug={slug}
            url="autopress.com"
          />

          {/* Publishing Options */}
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Yayın Ayarları
            </h3>

            <FormField label="Durum">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Article['status'])}
                className="input"
              >
                <option value="draft">Taslak</option>
                <option value="review">İncelemede</option>
                <option value="scheduled">Planlandı</option>
                <option value="published">Yayınlandı</option>
              </select>
            </FormField>

            <FormField label="Dil">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input"
              >
                <option value="TR">Türkçe</option>
                <option value="EN">English</option>
                <option value="DE">Deutsch</option>
                <option value="FR">Français</option>
                <option value="ES">Español</option>
                <option value="AR">العربية</option>
              </select>
            </FormField>

            <FormField label="Site">
              <select
                value={siteId || ''}
                onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : undefined)}
                className="input"
              >
                <option value="">Site seçin</option>
                <option value="1">Site 1</option>
                <option value="2">Site 2</option>
              </select>
            </FormField>
          </div>

          {/* Quick Stats */}
          <div className="card space-y-3">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide">
              İçerik İstatistikleri
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface rounded-lg p-3">
                <div className="text-2xl font-bold text-text">
                  {content.split(/\s+/).filter(Boolean).length}
                </div>
                <div className="text-sm text-text-muted">Kelime</div>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <div className="text-2xl font-bold text-text">
                  {Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)}
                </div>
                <div className="text-sm text-text-muted">Dakika Okuma</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Generation Modal */}
      <AIGenerationModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={handleAIGenerate}
        isGenerating={isAIGenerating}
      />
    </div>
  );
}
