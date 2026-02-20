import { useState, useCallback } from 'react';
import { Search, X, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';

export interface ImageSearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  source: 'pexels';
}

interface ImageSearchProps {
  onSelect: (image: ImageSearchResult) => void;
}

export default function ImageSearch({ onSelect }: ImageSearchProps) {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<ImageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const searchImages = useCallback(async (searchQuery: string, pageNum: number = 1) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/images/search', { params: { query: searchQuery, page: pageNum, perPage: 20 } });
      if (pageNum === 1) { setImages(response.data.data); } 
      else { setImages(prev => [...prev, ...response.data.data]); }
      setHasMore(response.data.data.length === 20);
      setPage(pageNum);
    } catch (err) {
      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 503) setError('Image search service is not configured.');
      else if (axiosError.response?.status === 429) setError('Rate limit exceeded.');
      else setError('Failed to search images.');
    } finally { setLoading(false); }
  }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); searchImages(query, 1); };
  const handleLoadMore = () => searchImages(query, page + 1);
  const handleClear = () => { setQuery(''); setImages([]); setError(null); setPage(1); setHasMore(false); };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for images..." className="input pl-10 pr-10" />
          {query && <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"><X className="w-5 h-5" /></button>}
        </div>
        <button type="submit" disabled={loading || !query.trim()} className="btn btn-primary">Search</button>
      </form>
      {error && <div className="bg-error/10 border border-error/20 text-error rounded-lg p-4 text-sm">{error}</div>}
      {loading && <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div></div>}
      {!loading && images.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <button key={image.id} type="button" onClick={() => onSelect(image)}
                className="group relative aspect-video rounded-lg overflow-hidden bg-surface-alt border border-border hover:border-primary-400 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
                <img src={image.thumbnailUrl} alt={image.alt || 'Stock image'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100">
                  <div className="absolute bottom-0 left-0 right-0 p-2"><p className="text-xs text-white truncate">{image.photographer}</p></div>
                </div>
              </button>
            ))}
          </div>
          {hasMore && <div className="flex justify-center"><button type="button" onClick={handleLoadMore} disabled={loading} className="btn btn-ghost">Load More</button></div>}
        </>
      )}
      {!loading && query && images.length === 0 && !error && <div className="text-center py-8"><ImageIcon className="w-12 h-12 text-text-muted mx-auto mb-3" /><p className="text-text-muted">No images found for "{query}"</p></div>}
      {!loading && images.length === 0 && !query && <div className="text-center py-8"><Search className="w-12 h-12 text-text-muted mx-auto mb-3" /><p className="text-text-muted">Search for images to add to your content</p></div>}
    </div>
  );
}

export function ImageAttribution({ image }: { image: ImageSearchResult }) {
  return (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <span>Photo by</span>
      <a href={image.photographerUrl} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">{image.photographer}</a>
      <span>on Pexels</span>
    </div>
  );
}
