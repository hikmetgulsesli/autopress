import { useState, useCallback, useEffect } from 'react';
import { Search, Image as ImageIcon, X, ExternalLink, User } from 'lucide-react';
import { imageApi } from '../services/api';
import type { UnsplashImage, ImageAttribution } from '../types';

interface ImageSearchProps {
  onSelect: (image: UnsplashImage, attribution: ImageAttribution) => void;
  selectedImageId?: string | null;
}

export default function ImageSearch({ onSelect, selectedImageId }: ImageSearchProps) {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait' | 'squarish' | ''>('landscape');
  const [selectedImage, setSelectedImage] = useState<UnsplashImage | null>(null);
  const [attribution, setAttribution] = useState<ImageAttribution | null>(null);

  const searchImages = useCallback(async (searchQuery: string, pageNum = 1) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const params: Parameters<typeof imageApi.search>[0] = {
        q: searchQuery.trim(),
        page: pageNum,
        per_page: 12,
      };

      if (orientation) {
        params.orientation = orientation;
      }

      const response = await imageApi.search(params);
      setImages(response.data);
      setTotalPages(response.meta.total_pages);
      setPage(response.meta.page);
    } catch (err: any) {
      const errorCode = err.response?.data?.error?.code;
      const errorMessage = err.response?.data?.error?.message;

      if (errorCode === 'MISSING_API_KEY') {
        setError('Unsplash API anahtarı yapılandırılmamış. Lütfen yönetici ile iletişime geçin.');
      } else if (errorCode === 'RATE_LIMITED') {
        setError('API limitine ulaşıldı. Lütfen biraz bekleyin.');
      } else {
        setError(errorMessage || 'Görsel araması başarısız oldu. Tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  }, [orientation]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchImages(query, 1);
  };

  const handleImageSelect = async (image: UnsplashImage) => {
    setSelectedImage(image);

    try {
      const response = await imageApi.getAttribution(image.id, 'html');
      setAttribution(response.data);
      onSelect(image, response.data);
    } catch (err) {
      // If attribution fails, still select the image with basic attribution
      const basicAttribution: ImageAttribution = {
        photo_id: image.id,
        attribution: `Photo by ${image.user.name} on Unsplash`,
        photographer: {
          name: image.user.name,
          username: image.user.username,
          link: `https://unsplash.com/@${image.user.username}`,
        },
        unsplash_link: image.links.html,
      };
      setAttribution(basicAttribution);
      onSelect(image, basicAttribution);
    }
  };

  const clearSelection = () => {
    setSelectedImage(null);
    setAttribution(null);
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() && query.length >= 2) {
        searchImages(query, 1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, searchImages]);

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-subtle)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Görsel ara... (örn: nature, business, technology)"
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary-400)] transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setImages([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
              aria-label="Aramayı temizle"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Orientation Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Yönlendirme:</span>
          <div className="flex gap-1">
            {[
              { value: '', label: 'Tümü' },
              { value: 'landscape', label: 'Yatay' },
              { value: 'portrait', label: 'Dikey' },
              { value: 'squarish', label: 'Kare' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setOrientation(opt.value as any)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  orientation === opt.value
                    ? 'bg-[var(--color-primary-400)] text-[var(--color-surface)]'
                    : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-lg text-[var(--color-error)] text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video bg-[var(--color-surface-alt)] rounded-lg animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      )}

      {/* Image Grid */}
      {!loading && images.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => handleImageSelect(image)}
                className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] ${
                  selectedImage?.id === image.id || selectedImageId === image.id
                    ? 'border-[var(--color-primary-400)] ring-2 ring-[var(--color-primary-400)]/30'
                    : 'border-transparent hover:border-[var(--color-border)]'
                }`}
              >
                <img
                  src={image.urls.small}
                  alt={image.alt_description || 'Unsplash görseli'}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 text-white text-xs">
                    <User className="w-3 h-3" />
                    <span className="truncate">{image.user.name}</span>
                  </div>
                </div>

                {/* Selected Indicator */}
                {(selectedImage?.id === image.id || selectedImageId === image.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-primary-400)]/20">
                    <div className="px-3 py-1.5 bg-[var(--color-primary-400)] text-[var(--color-surface)] text-sm font-medium rounded-full">
                      Seçildi
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => searchImages(query, page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--color-primary-400)] transition-colors"
              >
                Önceki
              </button>
              <span className="text-sm text-[var(--color-text-muted)]">
                Sayfa {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => searchImages(query, page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--color-primary-400)] transition-colors"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && images.length === 0 && query.length >= 2 && (
        <div className="text-center py-8">
          <ImageIcon className="w-12 h-12 mx-auto text-[var(--color-text-subtle)] mb-3" />
          <p className="text-[var(--color-text-muted)]">
            "{query}" için sonuç bulunamadı
          </p>
        </div>
      )}

      {/* Initial State */}
      {!loading && !error && images.length === 0 && query.length < 2 && (
        <div className="text-center py-8 border border-dashed border-[var(--color-border)] rounded-lg">
          <ImageIcon className="w-12 h-12 mx-auto text-[var(--color-text-subtle)] mb-3" />
          <p className="text-[var(--color-text-muted)]">
            Görsel aramak için bir kelime yazın
          </p>
          <p className="text-sm text-[var(--color-text-subtle)] mt-1">
            Örnek: nature, business, technology, abstract
          </p>
        </div>
      )}

      {/* Selected Image Preview */}
      {selectedImage && attribution && (
        <div className="mt-4 p-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg">
          <div className="flex items-start gap-4">
            <img
              src={selectedImage.urls.small}
              alt={selectedImage.alt_description || 'Seçilen görsel'}
              className="w-24 h-16 object-cover rounded-md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">
                    {selectedImage.alt_description || 'Başlıksız görsel'}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {selectedImage.width} x {selectedImage.height}px
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="p-1.5 text-[var(--color-text-subtle)] hover:text-[var(--color-error)] transition-colors rounded-md hover:bg-[var(--color-error)]/10"
                  aria-label="Seçimi kaldır"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Attribution */}
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-subtle)] mb-1">Atıf:</p>
                <div className="flex items-center gap-2">
                  <p
                    className="text-sm text-[var(--color-text-muted)]"
                    dangerouslySetInnerHTML={{ __html: attribution.attribution }}
                  />
                  <a
                    href={attribution.unsplash_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-[var(--color-text-subtle)] hover:text-[var(--color-primary-400)] transition-colors"
                    aria-label="Unsplash'da görüntüle"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
