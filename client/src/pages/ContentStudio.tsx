import { useState, useCallback } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { articleApi, type CreateArticleInput } from '../services/articleApi';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ToastContainer';

interface ArticleFormData {
  id?: number;
  title: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'review' | 'scheduled' | 'published';
  language: string;
  meta_title: string;
  meta_description: string;
  featured_image_url: string;
  site_id?: number;
  ai_model?: string;
}

const initialFormData: ArticleFormData = {
  title: '',
  content: '',
  excerpt: '',
  status: 'draft',
  language: 'tr',
  meta_title: '',
  meta_description: '',
  featured_image_url: '',
};

export default function ContentStudio() {
  const [formData, setFormData] = useState<ArticleFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const { toasts, removeToast, success, error } = useToast();

  const handleChange = useCallback((field: keyof ArticleFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      error('Başlık ve içerik alanları zorunludur');
      return;
    }

    setIsSaving(true);

    try {
      const articleData: CreateArticleInput & { id?: number } = {
        ...(formData.id ? { id: formData.id } : {}),
        site_id: formData.site_id,
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || undefined,
        status: formData.status,
        language: formData.language,
        meta_title: formData.meta_title || undefined,
        meta_description: formData.meta_description || undefined,
        featured_image_url: formData.featured_image_url || undefined,
        ai_model: formData.ai_model,
      };

      const savedArticle = await articleApi.save(articleData);

      setFormData((prev) => ({
        ...prev,
        id: savedArticle.id,
      }));

      success(formData.id ? 'Makale güncellendi' : 'Makale kaydedildi');
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Kaydetme başarısız oldu';
      error(message);
    } finally {
      setIsSaving(false);
    }
  }, [formData, success, error]);

  const isNewArticle = !formData.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            İçerik Stüdyosu
          </h1>
          <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
            AI ile SEO uyumlu içerik üretin
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--color-primary-400)',
            color: 'var(--color-surface)',
          }}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary-400)';
          }}
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

      <div
        className="rounded-xl p-6 space-y-6"
        style={{
          backgroundColor: 'var(--color-surface-alt)',
          borderColor: 'var(--color-border)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              Başlık *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Makale başlığı girin"
              className="w-full px-4 py-2 rounded-lg transition-all duration-150"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              İçerik *
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Makale içeriğini girin"
              rows={12}
              className="w-full px-4 py-2 rounded-lg transition-all duration-150 resize-none"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="excerpt"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              Özet
            </label>
            <textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              placeholder="Makale özeti girin (opsiyonel)"
              rows={3}
              className="w-full px-4 py-2 rounded-lg transition-all duration-150 resize-none"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="meta_title"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Meta Başlık
              </label>
              <input
                id="meta_title"
                type="text"
                value={formData.meta_title}
                onChange={(e) => handleChange('meta_title', e.target.value)}
                placeholder="SEO meta başlığı"
                className="w-full px-4 py-2 rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="meta_description"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Meta Açıklama
              </label>
              <input
                id="meta_description"
                type="text"
                value={formData.meta_description}
                onChange={(e) => handleChange('meta_description', e.target.value)}
                placeholder="SEO meta açıklaması"
                className="w-full px-4 py-2 rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Durum
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-2 rounded-lg transition-all duration-150 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="draft">Taslak</option>
                <option value="review">İncelemede</option>
                <option value="scheduled">Planlandı</option>
                <option value="published">Yayınlandı</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="language"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Dil
              </label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full px-4 py-2 rounded-lg transition-all duration-150 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="featured_image_url"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Kapak Görseli URL
              </label>
              <input
                id="featured_image_url"
                type="url"
                value={formData.featured_image_url}
                onChange={(e) => handleChange('featured_image_url', e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
