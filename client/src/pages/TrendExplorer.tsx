import { useEffect, useState, useCallback, useMemo } from 'react';
import { TrendingUp, Globe, AlertCircle, Loader2, X, BarChart3, Calendar } from 'lucide-react';
import api from '../services/api';
import type { InterestDataPoint, InterestOverTimeResult } from '../types';

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

type TimeRange = 7 | 30 | 90;

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

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 7, label: 'Son 7 Gün' },
  { value: 30, label: 'Son 30 Gün' },
  { value: 90, label: 'Son 90 Gün' },
];

// Simple SVG Line Chart Component
function InterestChart({ 
  data, 
  loading, 
  error 
}: { 
  data: InterestDataPoint[]; 
  loading: boolean;
  error: string | null;
}) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const values = data.map(d => d.value);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    
    const width = 600;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.value - min) / range) * chartHeight;
      return { x, y, value: d.value, date: d.date };
    });
    
    const pathD = points.length > 0 
      ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
      : '';
    
    const areaD = points.length > 0
      ? `M ${points[0].x},${padding.top + chartHeight} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${padding.top + chartHeight} Z`
      : '';
    
    return { points, pathD, areaD, width, height, padding, min, max };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48" data-testid="chart-loading">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" aria-hidden="true" />
        <span className="ml-2 text-text-muted">Grafik yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center" data-testid="chart-error">
        <AlertCircle className="w-8 h-8 text-error mb-2" aria-hidden="true" />
        <p className="text-error text-sm">{error}</p>
      </div>
    );
  }

  if (!chartData || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center" data-testid="chart-empty">
        <BarChart3 className="w-10 h-10 text-text-muted mb-2" aria-hidden="true" />
        <p className="text-text-muted text-sm">Grafik için veri bulunmuyor</p>
      </div>
    );
  }

  const { points, pathD, areaD, width, height, padding, min, max } = chartData;

  // Generate Y-axis labels
  const yLabels = [0, 25, 50, 75, 100];
  
  // Generate X-axis labels (show first, middle, last)
  const xLabels = [
    { index: 0, label: formatDateShort(data[0].date) },
    { index: Math.floor((data.length - 1) / 2), label: formatDateShort(data[Math.floor((data.length - 1) / 2)].date) },
    { index: data.length - 1, label: formatDateShort(data[data.length - 1].date) },
  ];

  return (
    <div className="w-full overflow-x-auto" data-testid="interest-chart">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full min-w-[400px]"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="İlgi grafiği"
      >
        {/* Grid lines */}
        {yLabels.map((label, i) => {
          const y = padding.top + (height - padding.top - padding.bottom) * (1 - i / (yLabels.length - 1));
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="var(--color-text-muted)"
                fontSize="10"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Area under the line */}
        <path
          d={areaD}
          fill="url(#gradient)"
          opacity="0.3"
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-primary-400)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="var(--color-surface-alt)"
            stroke="var(--color-primary-400)"
            strokeWidth="2"
          />
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => {
          const x = padding.left + (label.index / (data.length - 1 || 1)) * (width - padding.left - padding.right);
          return (
            <text
              key={i}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fill="var(--color-text-muted)"
              fontSize="10"
            >
              {label.label}
            </text>
          );
        })}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary-400)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-primary-400)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Helper function to format dates
function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function TrendExplorer() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected trend for detail panel
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [interestData, setInterestData] = useState<InterestDataPoint[]>([]);
  const [interestLoading, setInterestLoading] = useState<boolean>(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(30);

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

  const fetchInterestOverTime = useCallback(async (trend: Trend, days: TimeRange) => {
    setInterestLoading(true);
    setInterestError(null);
    
    try {
      const endTime = new Date();
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - days);
      
      const params = new URLSearchParams({
        keyword: trend.topic,
        region: trend.region || 'TR',
        language: trend.language || 'tr',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      
      const response = await api.get(`/trends/interest-over-time?${params.toString()}`);
      const result: InterestOverTimeResult = response.data.data;
      
      setInterestData(result.data || []);
    } catch (err: any) {
      setInterestError(err.response?.data?.error?.message || err.message || 'İlgi verisi yüklenirken bir hata oluştu');
      setInterestData([]);
    } finally {
      setInterestLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends(selectedRegion);
  }, [selectedRegion, fetchTrends]);

  // Fetch interest data when trend is selected or time range changes
  useEffect(() => {
    if (selectedTrend) {
      fetchInterestOverTime(selectedTrend, timeRange);
    }
  }, [selectedTrend, timeRange, fetchInterestOverTime]);

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRegion(e.target.value);
  };

  const handleTrendClick = (trend: Trend) => {
    setSelectedTrend(trend);
  };

  const handleCloseDetail = () => {
    setSelectedTrend(null);
    setInterestData([]);
    setInterestError(null);
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trends List */}
        <div className={selectedTrend ? 'lg:col-span-2' : 'lg:col-span-3'}>
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
                  const isSelected = selectedTrend?.id === trend.id;
                  
                  return (
                    <li
                      key={trend.id}
                      onClick={() => handleTrendClick(trend)}
                      className={`
                        card p-4 sm:p-5 cursor-pointer transition-all duration-200
                        ${isSelected ? 'ring-2 ring-primary-400' : 'hover:-translate-y-0.5'}
                      `}
                      style={{ transitionDelay: `${Math.min(index * 50, 300)}ms` }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleTrendClick(trend);
                        }
                      }}
                      aria-pressed={isSelected}
                      data-testid={`trend-item-${trend.id}`}
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
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedTrend && (
          <div className="lg:col-span-1">
            <div className="card p-5 sticky top-4" data-testid="trend-detail-panel">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white" data-testid="detail-title">
                    {selectedTrend.topic}
                  </h2>
                  <p className="text-sm text-dark-400 mt-1">
                    <Globe className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                    {selectedTrend.region || selectedTrend.language?.toUpperCase() || 'Global'}
                  </p>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="p-1.5 rounded-lg hover:bg-surface text-dark-400 hover:text-white transition-colors"
                  aria-label="Kapat"
                  data-testid="close-detail-btn"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Score Badge */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`px-4 py-2 rounded-lg ${getScoreBgColor(selectedTrend.score)}`}>
                  <span className="text-xs text-dark-400 uppercase tracking-wide">Skor</span>
                  <p className={`text-2xl font-bold tabular-nums ${getScoreColor(selectedTrend.score)}`}>
                    {selectedTrend.score}
                  </p>
                </div>
                <div className="px-4 py-2 rounded-lg bg-surface">
                  <span className="text-xs text-dark-400 uppercase tracking-wide">Kaynak</span>
                  <p className="text-white font-medium">{selectedTrend.source}</p>
                </div>
              </div>

              {/* Time Range Selector */}
              <div className="mb-4">
                <label className="text-sm text-dark-400 mb-2 block">Zaman Aralığı</label>
                <div className="flex gap-2" role="group" aria-label="Zaman aralığı seçimi">
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => handleTimeRangeChange(range.value)}
                      className={`
                        flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${timeRange === range.value 
                          ? 'bg-primary-400 text-surface' 
                          : 'bg-surface text-dark-400 hover:text-white'
                        }
                      `}
                      aria-pressed={timeRange === range.value}
                      data-testid={`time-range-${range.value}`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interest Chart */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-primary-400" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-white">İlgi Geçmişi</h3>
                </div>
                <div className="bg-surface rounded-lg p-4">
                  <InterestChart 
                    data={interestData} 
                    loading={interestLoading}
                    error={interestError}
                  />
                </div>
              </div>

              {/* Chart Stats */}
              {!interestLoading && !interestError && interestData.length > 0 && (
                <div className="grid grid-cols-2 gap-3" data-testid="chart-stats">
                  <div className="bg-surface rounded-lg p-3">
                    <p className="text-xs text-dark-400 uppercase tracking-wide">Ortalama</p>
                    <p className="text-lg font-semibold text-white tabular-nums">
                      {Math.round(interestData.reduce((sum, d) => sum + d.value, 0) / interestData.length)}
                    </p>
                  </div>
                  <div className="bg-surface rounded-lg p-3">
                    <p className="text-xs text-dark-400 uppercase tracking-wide">En Yüksek</p>
                    <p className="text-lg font-semibold text-emerald-400 tabular-nums">
                      {Math.max(...interestData.map(d => d.value))}
                    </p>
                  </div>
                </div>
              )}

              {/* Last Updated */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-dark-400">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  <span>Son güncelleme: {formatDateFull(selectedTrend.checked_at)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
