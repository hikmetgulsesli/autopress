import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  Globe,
  Languages,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  PenTool,
  Newspaper,
  BarChart3,
  RefreshCw,
  Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import api from '../services/api';
import type { Trend, Keyword } from '../types';

// Region and language options
const REGIONS = [
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
];

const LANGUAGES = [
  { code: 'tr', name: 'Türkçe' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ar', name: 'العربية' },
];

// Scoring algorithm: score = (volume * 0.4) + (cpc * 0.3) + (trend_rising * 0.3)
const calculateKeywordScore = (keyword: Partial<Keyword>): number => {
  const volume = keyword.search_volume || 0;
  const cpc = keyword.cpc || 0;
  const trendRising = keyword.trend_score || 0;

  // Normalize values (assuming max volume ~100000, max CPC ~10, max trend ~100)
  const normalizedVolume = Math.min(volume / 1000, 100);
  const normalizedCpc = Math.min(cpc * 10, 100);
  const normalizedTrend = Math.min(trendRising, 100);

  const score = normalizedVolume * 0.4 + normalizedCpc * 0.3 + normalizedTrend * 0.3;
  return Math.round(score);
};

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  source: string;
}

interface TrendDataPoint {
  date: string;
  value: number;
}

export default function TrendExplorer() {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState('TR');
  const [selectedLanguage, setSelectedLanguage] = useState('tr');
  const [activeTab, setActiveTab] = useState<'trends' | 'keywords' | 'rss'>('trends');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [trends, setTrends] = useState<Trend[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [rssItems, setRssItems] = useState<RSSItem[]>([]);
  const [interestData, setInterestData] = useState<TrendDataPoint[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  // Loading states
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isLoadingRSS, setIsLoadingRSS] = useState(false);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  // Fetch trending topics
  const fetchTrends = async () => {
    setIsLoadingTrends(true);
    try {
      const response = await api.get('/trends/trending', {
        params: { region: selectedRegion, language: selectedLanguage, limit: 50 },
      });
      setTrends(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch trends:', err);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  // Fetch keywords
  const fetchKeywords = async () => {
    setIsLoadingKeywords(true);
    try {
      const response = await api.get('/trends/keywords', {
        params: { language: selectedLanguage },
      });
      const fetchedKeywords = response.data || [];
      // Calculate scores for keywords
      const keywordsWithScores = fetchedKeywords.map((k: Keyword) => ({
        ...k,
        calculated_score: calculateKeywordScore(k),
      }));
      setKeywords(keywordsWithScores);
    } catch (err) {
      console.error('Failed to fetch keywords:', err);
    } finally {
      setIsLoadingKeywords(false);
    }
  };

  // Fetch RSS feeds
  const fetchRSS = async () => {
    setIsLoadingRSS(true);
    try {
      const response = await api.get('/rss/feeds', {
        params: { language: selectedLanguage, limit: 20 },
      });
      setRssItems(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch RSS:', err);
    } finally {
      setIsLoadingRSS(false);
    }
  };

  // Fetch interest over time for chart
  const fetchInterestData = async (keyword: string) => {
    setIsLoadingChart(true);
    try {
      const response = await api.get('/trends/interest-over-time', {
        params: {
          keyword,
          region: selectedRegion,
          language: selectedLanguage,
        },
      });
      const data = response.data.data?.data || [];
      setInterestData(data);
    } catch (err) {
      console.error('Failed to fetch interest data:', err);
      setInterestData([]);
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTrends();
    fetchKeywords();
    fetchRSS();
  }, [selectedRegion, selectedLanguage]);

  // Fetch chart data when keyword selected
  useEffect(() => {
    if (selectedKeyword) {
      fetchInterestData(selectedKeyword);
    }
  }, [selectedKeyword]);

  // Filter data based on search
  const filteredTrends = useMemo(() => {
    if (!searchQuery) return trends;
    return trends.filter((t) =>
      t.topic.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [trends, searchQuery]);

  const filteredKeywords = useMemo(() => {
    if (!searchQuery) return keywords;
    return keywords.filter((k) =>
      k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [keywords, searchQuery]);

  // Handle write article button
  const handleWriteArticle = (topic: string) => {
    navigate(`/content?topic=${encodeURIComponent(topic)}`);
  };

  // Get trend icon based on value
  const getTrendIcon = (value: number) => {
    if (value > 70) return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
    if (value < 30) return <ArrowDownRight className="w-4 h-4 text-rose-400" />;
    return <Minus className="w-4 h-4 text-amber-400" />;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(selectedLanguage === 'tr' ? 'tr-TR' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Trend Explorer</h1>
          <p className="text-dark-400 mt-1">Güncel trendleri keşfedin ve içerik fırsatlarını yakalayın</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchTrends();
              fetchKeywords();
              fetchRSS();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-surface-alt text-text-muted hover:text-text hover:bg-surface-elevated transition-all duration-200 cursor-pointer border border-border"
            style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-alt border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4"
        style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
      >
        {/* Region Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Bölge
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary-400 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {REGIONS.map((region) => (
              <option key={region.code} value={region.code}>
                {region.flag} {region.name}
              </option>
            ))}
          </select>
        </div>

        {/* Language Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
            <Languages className="w-4 h-4" />
            Dil
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary-400 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex-[2]">
          <label className="block text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Ara
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Trend veya anahtar kelime ara..."
              className="w-full px-4 py-2 pl-10 bg-surface border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary-400 transition-all"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('trends')}
          className={`px-4 py-3 font-medium text-sm transition-all duration-200 cursor-pointer border-b-2 ${
            activeTab === 'trends'
              ? 'text-primary-400 border-primary-400'
              : 'text-text-muted border-transparent hover:text-text'
          }`}
          style={activeTab === 'trends' ? { color: 'var(--color-primary-400)', borderColor: 'var(--color-primary-400)' } : {}}
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trendler
          </span>
        </button>
        <button
          onClick={() => setActiveTab('keywords')}
          className={`px-4 py-3 font-medium text-sm transition-all duration-200 cursor-pointer border-b-2 ${
            activeTab === 'keywords'
              ? 'text-primary-400 border-primary-400'
              : 'text-text-muted border-transparent hover:text-text'
          }`}
          style={activeTab === 'keywords' ? { color: 'var(--color-primary-400)', borderColor: 'var(--color-primary-400)' } : {}}
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Anahtar Kelimeler
          </span>
        </button>
        <button
          onClick={() => setActiveTab('rss')}
          className={`px-4 py-3 font-medium text-sm transition-all duration-200 cursor-pointer border-b-2 ${
            activeTab === 'rss'
              ? 'text-primary-400 border-primary-400'
              : 'text-text-muted border-transparent hover:text-text'
          }`}
          style={activeTab === 'rss' ? { color: 'var(--color-primary-400)', borderColor: 'var(--color-primary-400)' } : {}}
        >
          <span className="flex items-center gap-2">
            <Newspaper className="w-4 h-4" />
            RSS Haberler
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="bg-surface-alt border border-border rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <h2 className="font-semibold text-text flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-400" style={{ color: 'var(--color-primary-400)' }} />
                  Günlük Trendler
                </h2>
                <span className="text-sm text-text-muted">
                  {filteredTrends.length} sonuç
                </span>
              </div>

              {isLoadingTrends ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
                  <p className="text-text-muted">Trendler yükleniyor...</p>
                </div>
              ) : filteredTrends.length === 0 ? (
                <div className="p-12 text-center">
                  <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-muted">Henüz trend verisi bulunmuyor.</p>
                </div>
              ) : (
                <div className="divide-y divide-border" style={{ borderColor: 'var(--color-border)' }}>
                  {filteredTrends.map((trend, index) => (
                    <div
                      key={trend.id || index}
                      className="px-6 py-4 flex items-center justify-between hover:bg-surface/50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedKeyword(trend.topic)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-sm font-bold text-text-muted"
                          style={{ backgroundColor: 'var(--color-surface)' }}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-medium text-text group-hover:text-primary-400 transition-colors">
                            {trend.topic}
                          </h3>
                          <p className="text-sm text-text-muted">
                            {trend.source} • {formatDate(trend.checked_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(trend.score)}
                          <span className="font-semibold text-text">{trend.score}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWriteArticle(trend.topic);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-400/10 text-primary-400 hover:bg-primary-400/20 transition-all cursor-pointer"
                          style={{ color: 'var(--color-primary-400)' }}
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          Bu Konuda Yaz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Keywords Tab */}
          {activeTab === 'keywords' && (
            <div className="bg-surface-alt border border-border rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <h2 className="font-semibold text-text flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent-400" style={{ color: 'var(--color-accent-400)' }} />
                  Anahtar Kelime Analizi
                </h2>
                <span className="text-sm text-text-muted">
                  {filteredKeywords.length} sonuç
                </span>
              </div>

              {isLoadingKeywords ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-accent-400 animate-spin mx-auto mb-4" />
                  <p className="text-text-muted">Anahtar kelimeler yükleniyor...</p>
                </div>
              ) : filteredKeywords.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-muted">Henüz anahtar kelime verisi bulunmuyor.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border" style={{ borderColor: 'var(--color-border)' }}>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Anahtar Kelime
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                          Hacim
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                          Rekabet
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                          CPC
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                          Skor
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                          İşlem
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border" style={{ borderColor: 'var(--color-border)' }}>
                      {filteredKeywords.map((keyword) => (
                        <tr
                          key={keyword.id}
                          className="hover:bg-surface/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedKeyword(keyword.keyword)}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-text">{keyword.keyword}</p>
                              <p className="text-sm text-text-muted">
                                Son kontrol: {formatDate(keyword.last_checked)}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono text-text">
                              {(keyword.search_volume || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              (keyword.competition || 0) > 0.7
                                ? 'bg-rose-400/10 text-rose-400'
                                : (keyword.competition || 0) > 0.4
                                ? 'bg-amber-400/10 text-amber-400'
                                : 'bg-emerald-400/10 text-emerald-400'
                            }`}>
                              {((keyword.competition || 0) * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono text-text">
                              ${(keyword.cpc || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-bold text-primary-400" style={{ color: 'var(--color-primary-400)' }}>
                              {(keyword as any).calculated_score || calculateKeywordScore(keyword)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWriteArticle(keyword.keyword);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-400/10 text-primary-400 hover:bg-primary-400/20 transition-all cursor-pointer"
                              style={{ color: 'var(--color-primary-400)' }}
                            >
                              <PenTool className="w-3.5 h-3.5" />
                              Yaz
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* RSS Tab */}
          {activeTab === 'rss' && (
            <div className="bg-surface-alt border border-border rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <h2 className="font-semibold text-text flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-warning" style={{ color: 'var(--color-warning)' }} />
                  RSS Haber Akışı
                </h2>
                <span className="text-sm text-text-muted">
                  {rssItems.length} haber
                </span>
              </div>

              {isLoadingRSS ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-warning animate-spin mx-auto mb-4" />
                  <p className="text-text-muted">Haberler yükleniyor...</p>
                </div>
              ) : rssItems.length === 0 ? (
                <div className="p-12 text-center">
                  <Newspaper className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-muted">Henüz RSS verisi bulunmuyor.</p>
                </div>
              ) : (
                <div className="divide-y divide-border" style={{ borderColor: 'var(--color-border)' }}>
                  {rssItems.map((item, index) => (
                    <div
                      key={index}
                      className="px-6 py-4 hover:bg-surface/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-text hover:text-primary-400 transition-colors">
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {item.title}
                            </a>
                          </h3>
                          <p className="text-sm text-text-muted mt-1 line-clamp-2">
                            {item.contentSnippet}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                            <span>{item.source}</span>
                            <span>•</span>
                            <span>{formatDate(item.pubDate)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleWriteArticle(item.title)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-400/10 text-primary-400 hover:bg-primary-400/20 transition-all cursor-pointer flex-shrink-0"
                          style={{ color: 'var(--color-primary-400)' }}
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          Yaz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Chart */}
        <div className="space-y-4">
          <div className="bg-surface-alt border border-border rounded-xl p-6"
            style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-400" style={{ color: 'var(--color-primary-400)' }} />
              İlgi Zaman Çizelgesi
            </h3>

            {selectedKeyword ? (
              <div>
                <p className="text-sm text-text-muted mb-4">
                  Seçili: <span className="text-text font-medium">{selectedKeyword}</span>
                </p>

                {isLoadingChart ? (
                  <div className="h-64 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-primary-400 animate-spin" />
                  </div>
                ) : interestData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={interestData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary-400)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--color-primary-400)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                          tickLine={{ stroke: 'var(--color-border)' }}
                          axisLine={{ stroke: 'var(--color-border)' }}
                          tickFormatter={(value) => {
                            try {
                              return new Date(value).toLocaleDateString('tr-TR', { month: 'short' });
                            } catch {
                              return value;
                            }
                          }}
                        />
                        <YAxis
                          tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                          tickLine={{ stroke: 'var(--color-border)' }}
                          axisLine={{ stroke: 'var(--color-border)' }}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: 'var(--color-text)' }}
                          itemStyle={{ color: 'var(--color-primary-400)' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="var(--color-primary-400)"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorValue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-text-muted">
                    <p>Veri bulunamadı</p>
                  </div>
                )}

                <button
                  onClick={() => handleWriteArticle(selectedKeyword)}
                  className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary-400 text-surface hover:bg-primary-500 transition-all cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary-400)', color: 'var(--color-surface)' }}
                >
                  <PenTool className="w-4 h-4" />
                  Bu Konuda Yaz
                </button>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-text-muted">
                <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                <p>Grafik görüntülemek için bir trend veya anahtar kelime seçin</p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-surface-alt border border-border rounded-xl p-6"
            style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="font-semibold text-text mb-4">Hızlı İstatistikler</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Toplam Trend</span>
                <span className="font-semibold text-text">{trends.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Anahtar Kelime</span>
                <span className="font-semibold text-text">{keywords.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">RSS Haber</span>
                <span className="font-semibold text-text">{rssItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Ortalama Skor</span>
                <span className="font-semibold text-primary-400" style={{ color: 'var(--color-primary-400)' }}>
                  {keywords.length > 0
                    ? Math.round(
                        keywords.reduce((sum, k) => sum + calculateKeywordScore(k), 0) / keywords.length
                      )
                    : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
