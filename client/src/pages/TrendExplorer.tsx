import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Globe, AlertCircle, Loader2, FilePlus } from 'lucide-react';
import api from '../services/api';

interface Trend {
  id: number;
  topic: string;
  score: number;
  source: string;
  language: string;
  region: string;
  raw_data: any;
  checked_at: string;
}

interface TrendsResponse {
  data: Trend[];
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

const REGIONS = [
  { value: 'all', label: 'Tüm Bölgeler' },
  { value: 'TR', label: 'Türkiye' },
  { value: 'US', label: 'ABD' },
  { value: 'GB', label: 'Birleşik Krallık' },
  { value: 'DE', label: 'Almanya' },
  { value: 'FR', label: 'Fransa' },
  { value: 'ES', label: 'İspanya' },
  { value: 'IT', label: 'İtalya' },
  { value: 'BR', label: 'Brezilya' },
  { value: 'IN', label: 'Hindistan' },
  { value: 'JP', label: 'Japonya' },
  { value: 'KR', label: 'Güney Kore' },
];

export default function TrendExplorer() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingArticleId, setCreatingArticleId] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchTrends = useCallback(async (region: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (region !== 'all') {
        params.append('region', region);
      }
      params.append('limit', '50');
      
      const response = await api.get(`/trends?${params.toString()}`);
      const data = response.data;
      
      // Handle both array response and wrapped response
      const trendsData = Array.isArray(data) ? data : data.data || [];
      setTrends(trendsData);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Trendler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends(selectedRegion);
  }, [selectedRegion, fetchTrends]);

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRegion(e.target.value);
  };

  const handleCreateArticle = (topic: string, trendId: number) => {
    setCreatingArticleId(trendId);
    // Navigate to ContentStudio with topic pre-filled
    navigate(`/content?topic=${encodeURIComponent(topic)}`);
  };

  const getNewsCount = (trend: Trend): number => {
    if (trend.raw_data && typeof trend.raw_data === 'object') {
      return trend.raw_data.news_count || trend.raw_data.articleCount || trend.raw_data.articles || 0;
    }
    return 0;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-cyan-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-dark-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-emerald-500/20';
    if (score >= 60) return 'bg-cyan-500/20';
    if (score >= 40) return 'bg-amber-500/20';
    return 'bg-dark-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Trend Explorer</h1>
          <p className="text-dark-400 mt-1">Güncel trendleri keşfedin ve analiz edin</p>
        </div>
        
        {/* Region Filter */}
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary-400" aria-hidden="true" />
          <label htmlFor="region-filter" className="sr-only">
            Bölge seçin
          </label>
          <select
            id="region-filter"
            value={selectedRegion}
            onChange={handleRegionChange}
            disabled={loading}
            className="input min-w-[180px] cursor-pointer"
            aria-label="Bölge filtresi"
          >
            {REGIONS.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card p-12 text-center">
          <Loader2 
            className="w-10 h-10 text-primary-400 mx-auto mb-4 animate-spin" 
            aria-hidden="true"
          />
          <p className="text-dark-400">Trendler yükleniyor...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div 
          className="card p-8 text-center border-error/30"
          role="alert"
          aria-live="assertive"
        >
          <div className="w-12 h-12 bg-error/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-error" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Bir hata oluştu</h3>
          <p className="text-dark-400 mb-4">{error}</p>
          <button
            onClick={() => fetchTrends(selectedRegion)}
            className="btn btn-primary"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && trends.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-primary-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-primary-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Henüz trend yok</h3>
          <p className="text-dark-400">
            {selectedRegion === 'all' 
              ? 'Şu anda görüntülenecek trend bulunmuyor.' 
              : 'Seçili bölge için henüz trend verisi bulunmuyor.'}
          </p>
        </div>
      )}

      {/* Trends List */}
      {!loading && !error && trends.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-dark-400 px-1">
            <span>{trends.length} trend bulundu</span>
            <span className="hidden sm:inline">Skor ve haber sayısına göre sıralandı</span>
          </div>
          
          <ul className="space-y-3" role="list">
            {trends.map((trend, index) => {
              const newsCount = getNewsCount(trend);
              const scoreColor = getScoreColor(trend.score);
              const scoreBgColor = getScoreBgColor(trend.score);
              
              return (
                <li
                  key={trend.id}
                  className="card p-4 sm:p-5 hover:-translate-y-0.5 transition-transform duration-200"
                  style={{ transitionDelay: `${Math.min(index * 50, 300)}ms` }}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    {/* Rank Number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-sm font-medium text-dark-400">
                      {index + 1}
                    </div>
                    
                    {/* Trend Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate" title={trend.topic}>
                        {trend.topic}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-dark-400">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                          {trend.region || trend.language?.toUpperCase() || 'Global'}
                        </span>
                        <span>•</span>
                        <span>Kaynak: {trend.source}</span>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-3 sm:gap-6">
                      {/* Create Article Button */}
                      <button
                        onClick={() => handleCreateArticle(trend.topic, trend.id)}
                        disabled={creatingArticleId === trend.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none"
                        aria-label={`${trend.topic} için makale oluştur`}
                      >
                        {creatingArticleId === trend.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <FilePlus className="w-4 h-4" aria-hidden="true" />
                        )}
                        <span className="hidden sm:inline text-sm font-medium">
                          {creatingArticleId === trend.id ? 'Oluşturuluyor...' : 'Makale Oluştur'}
                        </span>
                      </button>

                      {/* News Count */}
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-dark-400 uppercase tracking-wide">Haber</p>
                        <p className="text-white font-medium tabular-nums">
                          {newsCount > 0 ? newsCount.toLocaleString('tr-TR') : '-'}
                        </p>
                      </div>
                      
                      {/* Score */}
                      <div className={`flex-shrink-0 px-3 py-1.5 rounded-lg ${scoreBgColor}`}>
                        <span className={`text-sm font-semibold tabular-nums ${scoreColor}`}>
                          {trend.score}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
