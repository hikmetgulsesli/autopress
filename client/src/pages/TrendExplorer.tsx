import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Globe, AlertCircle, Loader2, Search, FileText, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

interface InterestDataPoint {
  date: string;
  value: number;
}

interface TrendsResponse {
  data: Trend[];
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface InterestOverTimeResponse {
  data: InterestDataPoint[];
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
  const navigate = useNavigate();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [filteredTrends, setFilteredTrends] = useState<Trend[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected trend for chart
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [interestData, setInterestData] = useState<InterestDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string | null>(null);

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
      setFilteredTrends(trendsData);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Trendler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInterestOverTime = useCallback(async (keyword: string) => {
    setChartLoading(true);
    setChartError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('keyword', keyword);
      params.append('region', selectedRegion !== 'all' ? selectedRegion : 'TR');
      
      const response = await api.get<InterestOverTimeResponse>(`/trends/interest-over-time?${params.toString()}`);
      const data = response.data.data || [];
      setInterestData(data);
    } catch (err: any) {
      setChartError(err.response?.data?.error?.message || err.message || 'İlgi verisi yüklenirken bir hata oluştu');
      setInterestData([]);
    } finally {
      setChartLoading(false);
    }
  }, [selectedRegion]);

  // Filter trends when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTrends(trends);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = trends.filter(trend => 
        trend.topic.toLowerCase().includes(query)
      );
      setFilteredTrends(filtered);
    }
  }, [searchQuery, trends]);

  useEffect(() => {
    fetchTrends(selectedRegion);
  }, [selectedRegion, fetchTrends]);

  // Fetch interest data when a trend is selected
  useEffect(() => {
    if (selectedTrend) {
      fetchInterestOverTime(selectedTrend.topic);
    } else {
      setInterestData([]);
    }
  }, [selectedTrend, fetchInterestOverTime]);

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRegion(e.target.value);
    setSelectedTrend(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleTrendSelect = (trend: Trend) => {
    setSelectedTrend(prev => prev?.id === trend.id ? null : trend);
  };

  const handleCreateArticle = (trend: Trend, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to Content Studio with the trend pre-filled
    const params = new URLSearchParams();
    params.set('topic', trend.topic);
    navigate(`/content?${params.toString()}`);
  };

  const handleCloseChart = () => {
    setSelectedTrend(null);
    setInterestData([]);
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

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
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

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-dark-400" aria-hidden="true" />
        </div>
        <label htmlFor="search-trends" className="sr-only">
          Trend ara
        </label>
        <input
          id="search-trends"
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Trend ara..."
          className="input pl-10 pr-10"
          aria-label="Trend ara"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-white"
            aria-label="Aramayı temizle"
          >
            <X className="h-5 w-5 text-dark-400" aria-hidden="true" />
          </button>
        )}
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
      {!loading && !error && filteredTrends.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-primary-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-primary-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery ? 'Sonuç bulunamadı' : 'Henüz trend yok'}
          </h3>
          <p className="text-dark-400">
            {searchQuery 
              ? `"${searchQuery}" için arama sonucu bulunmuyor.` 
              : selectedRegion === 'all' 
                ? 'Şu anda görüntülenecek trend bulunmuyor.' 
                : 'Seçili bölge için henüz trend verisi bulunmuyor.'}
          </p>
        </div>
      )}

      {/* Interest Over Time Chart */}
      {!loading && !error && selectedTrend && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">
                İlgi Grafiği: {selectedTrend.topic}
              </h2>
              <p className="text-sm text-dark-400 mt-1">
                Zaman içindeki ilgi trendi
              </p>
            </div>
            <button
              onClick={handleCloseChart}
              className="p-2 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors"
              aria-label="Grafiği kapat"
            >
              <X className="w-5 h-5 text-dark-400" aria-hidden="true" />
            </button>
          </div>
          
          {chartLoading && (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 
                className="w-8 h-8 text-primary-400 animate-spin" 
                aria-hidden="true"
              />
            </div>
          )}
          
          {chartError && (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-error">{chartError}</p>
            </div>
          )}
          
          {!chartLoading && !chartError && interestData.length > 0 && (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={interestData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={(value: number) => [value, 'İlgi']}
                    labelFormatter={formatDate}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#06B6D4" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#06B6D4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {!chartLoading && !chartError && interestData.length === 0 && (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-dark-400">Bu trend için ilgi verisi bulunmuyor</p>
            </div>
          )}
        </div>
      )}

      {/* Trends List */}
      {!loading && !error && filteredTrends.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-dark-400 px-1">
            <span>
              {searchQuery 
                ? `"${searchQuery}" için ${filteredTrends.length} sonuç bulundu`
                : `${filteredTrends.length} trend bulundu`}
            </span>
            <span className="hidden sm:inline">Skor ve haber sayısına göre sıralandı</span>
          </div>
          
          <ul className="space-y-3" role="list">
            {filteredTrends.map((trend, index) => {
              const newsCount = getNewsCount(trend);
              const scoreColor = getScoreColor(trend.score);
              const scoreBgColor = getScoreBgColor(trend.score);
              const isSelected = selectedTrend?.id === trend.id;
              
              return (
                <li
                  key={trend.id}
                  className={`card p-4 sm:p-5 hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer ${
                    isSelected ? 'ring-2 ring-primary-400' : ''
                  }`}
                  style={{ transitionDelay: `${Math.min(index * 50, 300)}ms` }}
                  onClick={() => handleTrendSelect(trend)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleTrendSelect(trend);
                    }
                  }}
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
                      
                      {/* Create Article Button */}
                      <button
                        onClick={(e) => handleCreateArticle(trend, e)}
                        className="btn btn-primary btn-sm flex items-center gap-1.5"
                        aria-label={`${trend.topic} için makale oluştur`}
                      >
                        <FileText className="w-4 h-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Makale Oluştur</span>
                      </button>
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
