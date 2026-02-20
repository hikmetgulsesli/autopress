import { useState } from 'react';
import { PenTool, Sparkles, Image as ImageIcon, Search } from 'lucide-react';
import ImageSearch from '../components/ImageSearch';
import type { UnsplashImage, ImageAttribution } from '../types';

export default function ContentStudio() {
  const [activeTab, setActiveTab] = useState<'content' | 'images'>('content');
  const [featuredImage, setFeaturedImage] = useState<UnsplashImage | null>(null);
  const [featuredImageAttribution, setFeaturedImageAttribution] = useState<ImageAttribution | null>(null);

  const handleImageSelect = (image: UnsplashImage, attribution: ImageAttribution) => {
    setFeaturedImage(image);
    setFeaturedImageAttribution(attribution);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">İçerik Stüdyosu</h1>
        <p className="text-[var(--color-text-muted)] mt-1">AI ile SEO uyumlu içerik üretin</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'content'
                ? 'text-[var(--color-primary-400)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <PenTool className="w-4 h-4" />
            İçerik
            {activeTab === 'content' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-400)]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'images'
                ? 'text-[var(--color-primary-400)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Görsel Arama
            {featuredImage && (
              <span className="ml-1.5 w-2 h-2 bg-[var(--color-accent-400)] rounded-full" />
            )}
            {activeTab === 'images' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-400)]" />
            )}
          </button>
        </nav>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Featured Image Summary */}
          {featuredImage && featuredImageAttribution && (
            <div className="p-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={featuredImage.urls.thumb}
                    alt={featuredImage.alt_description || 'Öne çıkan görsel'}
                    className="w-16 h-12 object-cover rounded-md"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Öne Çıkan Görsel Seçildi</p>
                    <p
                      className="text-xs text-[var(--color-text-muted)]"
                      dangerouslySetInnerHTML={{ __html: featuredImageAttribution.attribution }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('images')}
                  className="text-sm text-[var(--color-primary-400)] hover:text-[var(--color-primary-300)] transition-colors"
                >
                  Değiştir
                </button>
              </div>
            </div>
          )}

          {/* Content Generation Placeholder */}
          <div className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[var(--color-primary-400)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-[var(--color-primary-400)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text)]">AI İçerik Üretimi</h3>
            <p className="text-[var(--color-text-muted)] mt-1">Yakında aktif olacak</p>
          </div>
        </div>
      )}

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[var(--color-text)]">Unsplash Görsel Arama</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Yüksek kaliteli ücretsiz görseller arayın ve öne çıkan görsel olarak ayarlayın</p>
            </div>
          </div>

          <ImageSearch
            onSelect={handleImageSelect}
            selectedImageId={featuredImage?.id}
          />

          {/* Selected Image Info */}
          {featuredImage && featuredImageAttribution && (
            <div className="mt-6 p-4 bg-[var(--color-accent-400)]/10 border border-[var(--color-accent-400)]/20 rounded-lg">
              <p className="text-sm text-[var(--color-text)]">
                Bu görsel öne çıkan görsel olarak ayarlandı. İçerik yayınlandığında görsel URL'si otomatik olarak kullanılacak.
              </p>
              <div className="mt-2 p-2 bg-[var(--color-surface)] rounded font-mono text-xs text-[var(--color-text-muted)] break-all">
                {featuredImage.urls.regular}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
