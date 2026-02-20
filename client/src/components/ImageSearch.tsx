import { useState, useCallback } from 'react';
import { Search, Image as ImageIcon, Loader2, ExternalLink, Check } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../services/api';
import type { ImageSearchResult, ImageSearchMeta } from '../types';

interface ImageSearchProps {
  onSelect: (image: ImageSearchResult) => void;
  selectedImageId?: string;
}

export default function ImageSearch({ onSelect, selectedImageId }: ImageSearchProps) {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<ImageSearchResult[]>([]);
  const [meta, setMeta] = useState<ImageSearchMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const searchImages = useCallback(async (searchQuery: string, pageNum: number = 1) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/images/search', {
        params: {
          q: searchQuery.trim(),
          page: pageNum,
          per_page: 12,
        },
      });

      setImages(response.data.data);
      setMeta(response.data.meta);
      setPage(pageNum);
    } catch (err: any) {
      const errorCode = err.response?.data?.error?.code;
      const errorMessage = err.response?.data?.error?.message;

      if (errorCode === 'MISSING_API_KEY' || errorCode === 'AUTH_ERROR') {
        setError('Image search is not configured. Please contact the administrator.');
      } else if (errorCode === 'RATE_LIMITED') {
        setError('Rate limit exceeded. Please try again in a few minutes.');
      } else {
        setError(errorMessage || 'Failed to search images. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchImages(query, 1);
  };

  const handleLoadMore = () => {
    if (meta && page < meta.totalPages) {
      searchImages(query, page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      searchImages(query, page - 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for images (e.g., nature, technology, business)..."
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary-400 transition-colors"
            aria-label="Search images"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2',
            'bg-primary-400 text-surface hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          style={{ backgroundColor: 'var(--color-primary-400)', color: 'var(--color-surface)' }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* Results Grid */}
      {images.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <button
                key={image.id}
                onClick={() => onSelect(image)}
                className={clsx(
                  'group relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
                  selectedImageId === image.id
                    ? 'border-primary-400 ring-2 ring-primary-400'
                    : 'border-border hover:border-primary-400/50'
                )}
                style={{ borderColor: selectedImageId === image.id ? 'var(--color-primary-400)' : undefined }}
                aria-label={image.altDescription || image.description || 'Select image'}
                aria-pressed={selectedImageId === image.id}
              >
                <img
                  src={image.thumbUrl}
                  alt={image.altDescription || image.description || 'Stock photo'}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                
                {/* Selected Overlay */}
                {selectedImageId === image.id && (
                  <div className="absolute inset-0 bg-primary-400/20 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(var(--color-primary-400-rgb, 34, 211, 238), 0.2)' }}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-400 flex items-center justify-center"
                      style={{ backgroundColor: 'var(--color-primary-400)' }}
                    >
                      <Check className="w-5 h-5 text-surface" />
                    </div>
                  </div>
                )}
                
                {/* Hover Overlay with Photographer */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-medium truncate">
                      {image.photographer.name}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border"
            style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                onClick={handlePrevPage}
                disabled={page <= 1 || loading}
                className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <span className="text-sm text-text-muted">
                Page {page} of {meta.totalPages}
              </span>
              
              <button
                onClick={handleLoadMore}
                disabled={page >= meta.totalPages || loading}
                className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* Results Count */}
          <p className="text-xs text-text-muted text-center">
            Showing {images.length} of {meta?.total || 0} results
          </p>
        </>
      )}

      {/* Empty State */}
      {!loading && images.length === 0 && !error && query && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface-alt rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-surface-alt)' }}
          >
            <ImageIcon className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-muted">No images found for "{query}"</p>
          <p className="text-text-subtle text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {/* Initial State */}
      {!loading && images.length === 0 && !error && !query && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface-alt rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-surface-alt)' }}
          >
            <ImageIcon className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-muted">Search for stock photos</p>
          <p className="text-text-subtle text-sm mt-1">Powered by Unsplash</p>
        </div>
      )}
    </div>
  );
}
