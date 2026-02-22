import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Link as LinkIcon,
  FileText,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  RefreshCw,
  BarChart3,
  ExternalLink,
  Lightbulb
} from 'lucide-react';
import api from '../services/api';
import { useSiteStore, Site } from '../store/siteStore';

interface BulkJob {
  id: number;
  job_type: 'seo_analysis' | 'link_checker' | 'internal_links';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_items: number;
  processed_items: number;
  failed_items: number;
  created_at: string;
  completed_at?: string;
  results?: {
    summary?: {
      total_analyzed?: number;
      error_count?: number;
      warning_count?: number;
      avg_seo_score?: number;
      articles_with_errors?: number;
      broken_links_found?: number;
      suggestions_created?: number;
    };
  };
}

interface BrokenLink {
  id: number;
  article_id: number;
  article_title: string;
  url: string;
  link_type: 'internal' | 'external';
  anchor_text?: string;
  status_code?: number;
  error_message?: string;
  last_checked: string;
}

interface LinkSuggestion {
  id: number;
  source_article_id: number;
  source_title: string;
  target_article_id: number;
  target_title: string;
  suggested_anchor_text?: string;
  relevance_score: number;
  context_snippet?: string;
}

const inputClassName = "w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2";
const inputStyle = {
  backgroundColor: 'var(--color-surface-alt)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)'
};
const inputFocusStyle = {
  boxShadow: '0 0 0 2px rgba(251, 191, 36, 0.5)'
};

export default function SEOTools() {
  const { sites, fetchSites } = useSiteStore();
  const [activeTab, setActiveTab] = useState<'analysis' | 'links' | 'suggestions' | 'jobs'>('analysis');
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [brokenLinks, setBrokenLinks] = useState<BrokenLink[]>([]);
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    status: '',
    language: '',
  });

  // Poll running jobs every 5 seconds
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobsCallback = useCallback(async () => {
    try {
      const response = await api.get('/bulk-seo/jobs');
      setJobs(response.data.data);
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch jobs');
      return [];
    }
  }, []);

  useEffect(() => {
    fetchSites();
    fetchJobsCallback();
  }, [fetchJobsCallback]);

  // Auto-poll when there are running/pending jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => j.status === 'running' || j.status === 'pending');
    if (hasActiveJobs) {
      pollingRef.current = setInterval(() => {
        fetchJobsCallback();
      }, 5000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobs, fetchJobsCallback]);

  useEffect(() => {
    if (activeTab === 'links') {
      fetchBrokenLinks();
    } else if (activeTab === 'suggestions') {
      fetchSuggestions();
    }
  }, [activeTab]);



  const fetchBrokenLinks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bulk-seo/broken-links');
      setBrokenLinks(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch broken links');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bulk-seo/suggestions');
      setSuggestions(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch suggestions');
    } finally {
      setLoading(false);
    }
  };

  const startSEOAnalysis = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.site_id) params.site_id = filters.site_id;
      if (filters.status) params.status = filters.status;
      if (filters.language) params.language = filters.language;
      
      await api.post('/bulk-seo/analyze', params);
      await fetchJobsCallback();
      setActiveTab('jobs');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to start analysis');
    } finally {
      setLoading(false);
    }
  };

  const startLinkChecker = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.site_id) params.site_id = filters.site_id;
      
      await api.post('/bulk-seo/check-links', params);
      await fetchJobsCallback();
      setActiveTab('jobs');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to start link checker');
    } finally {
      setLoading(false);
    }
  };

  const startLinkSuggestions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.site_id) params.site_id = filters.site_id;
      
      await api.post('/bulk-seo/suggest-links', params);
      await fetchJobsCallback();
      setActiveTab('jobs');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to start link suggestions');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.status) params.append('status', filters.status);
      
      const response = await api.get(`/bulk-seo/export?${params.toString()}`);
      
      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seo-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seo-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to export report');
    }
  };

  const applySuggestion = async (id: number) => {
    try {
      await api.post(`/bulk-seo/suggestions/${id}/apply`);
      await fetchSuggestions();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to apply suggestion');
    }
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />;
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-warning)' }} />;
      case 'failed':
        return <XCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />;
      case 'pending':
        return <RefreshCw className="w-5 h-5" style={{ color: 'var(--color-text-subtle)' }} />;
      default:
        return <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-text-subtle)' }} />;
    }
  };

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'seo_analysis':
        return 'SEO Analizi';
      case 'link_checker':
        return 'Link Kontrolü';
      case 'internal_links':
        return 'İç Link Önerileri';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>SEO Araçları</h1>
        <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>Makalelerinizin SEO performansını analiz edin ve linkleri kontrol edin</p>
      </div>

      {error && (
        <div 
          className="rounded-lg p-4 flex items-center gap-3"
          style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)' }}
        >
          <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
          <button 
            onClick={() => setError('')} 
            className="ml-auto transition-colors"
            style={{ color: 'var(--color-error)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-error)'}
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {[
          { id: 'analysis', label: 'Toplu Analiz', icon: BarChart3 },
          { id: 'links', label: 'Kırık Linkler', icon: LinkIcon },
          { id: 'suggestions', label: 'Link Önerileri', icon: Lightbulb },
          { id: 'jobs', label: 'İşlemler', icon: RefreshCw },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: activeTab === tab.id ? 'var(--color-warning)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-warning)' : 'var(--color-text-muted)'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <div 
            className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <BarChart3 className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
              Toplu SEO Analizi
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Site</label>
                <select
                  value={filters.site_id}
                  onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
                  className={inputClassName}
                  style={inputStyle}
                >
                  <option value="">Tüm Siteler</option>
                  {sites.map((site: Site) => (
                    <option key={site.id} value={site.id.toString()}>
                      {site.name} ({site.platform})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Durum</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className={inputClassName}
                  style={inputStyle}
                >
                  <option value="">Tümü</option>
                  <option value="draft">Taslak</option>
                  <option value="published">Yayında</option>
                  <option value="scheduled">Planlanmış</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Dil</label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                  className={inputClassName}
                  style={inputStyle}
                >
                  <option value="">Tümü</option>
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={startSEOAnalysis}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: 'var(--color-warning)', color: 'var(--color-surface)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-warning)'}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Analiz Başlat
              </button>
              
              <button
                onClick={startLinkChecker}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-border)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-alt)'}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                Link Kontrolü
              </button>
              
              <button
                onClick={startLinkSuggestions}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-border)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-alt)'}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                Link Önerileri
              </button>
            </div>
          </div>

          <div 
            className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Download className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
              Rapor İndir
            </h3>
            
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Tüm makalelerin SEO analiz raporunu JSON veya CSV formatında indirin.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => exportReport('json')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-border)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-alt)'}
              >
                <FileText className="w-4 h-4" />
                JSON İndir
              </button>
              
              <button
                onClick={() => exportReport('csv')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-border)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-alt)'}
              >
                <Download className="w-4 h-4" />
                CSV İndir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broken Links Tab */}
      {activeTab === 'links' && (
        <div 
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div 
            className="p-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <LinkIcon className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
              Kırık Linkler
              <span 
                className="ml-2 px-2 py-0.5 text-xs rounded-full"
                style={{ backgroundColor: 'rgba(248, 113, 113, 0.2)', color: 'var(--color-error)' }}
              >
                {brokenLinks.length}
              </span>
            </h3>
            <button
              onClick={fetchBrokenLinks}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-alt)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'var(--color-warning)' }} />
              <p style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</p>
            </div>
          ) : brokenLinks.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-success)' }} />
              <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Kırık link bulunamadı!</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>Tüm linkler çalışıyor gibi görünüyor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>Makale</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>Link</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>Tip</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>Kontrol</th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: '1px solid var(--color-border)' }}>
                  {brokenLinks.map((link) => (
                    <tr 
                      key={link.id} 
                      className="transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(63, 63, 70, 0.5)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'var(--color-text)' }}>{link.article_title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm flex items-center gap-1 transition-colors"
                          style={{ color: 'var(--color-warning)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#f59e0b'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-warning)'}
                        >
                          {link.url.substring(0, 50)}
                          {link.url.length > 50 && '...'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {link.anchor_text && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>"{link.anchor_text}"</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span 
                          className="px-2 py-1 text-xs rounded-full"
                          style={link.link_type === 'internal'
                            ? { backgroundColor: 'rgba(96, 165, 250, 0.2)', color: '#60a5fa' }
                            : { backgroundColor: 'rgba(192, 132, 252, 0.2)', color: '#c084fc' }
                          }
                        >
                          {link.link_type === 'internal' ? 'İç' : 'Dış'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'var(--color-error)' }}>
                          {link.status_code || 'Hata'}
                        </span>
                        {link.error_message && (
                          <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>{link.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(link.last_checked).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div 
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div 
            className="p-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Lightbulb className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
              İç Link Önerileri
              <span 
                className="ml-2 px-2 py-0.5 text-xs rounded-full"
                style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', color: 'var(--color-warning)' }}
              >
                {suggestions.length}
              </span>
            </h3>
            <button
              onClick={fetchSuggestions}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-alt)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'var(--color-warning)' }} />
              <p style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-subtle)' }} />
              <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Öneri bulunamadı</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>Link önerileri oluşturmak için "Link Önerileri" butonunu kullanın.</p>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--color-border)' }}>
              {suggestions.map((suggestion) => (
                <div 
                  key={suggestion.id} 
                  className="p-4 transition-colors"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(63, 63, 70, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ color: 'var(--color-text)' }} className="font-medium">{suggestion.source_title}</span>
                        <span style={{ color: 'var(--color-text-subtle)' }}>→</span>
                        <span style={{ color: 'var(--color-warning)' }}>{suggestion.target_title}</span>
                      </div>
                      
                      {suggestion.context_snippet && (
                        <p 
                          className="text-sm p-2 rounded"
                          style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface-alt)' }}
                        >
                          ...{suggestion.context_snippet}...
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>Önerilen metin:</span>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>"{suggestion.suggested_anchor_text}"</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>Relevans:</span>
                          <div 
                            className="w-16 h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--color-border)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ 
                                width: `${suggestion.relevance_score}%`,
                                backgroundColor: 'var(--color-warning)'
                              }}
                            />
                          </div>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{suggestion.relevance_score}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => applySuggestion(suggestion.id)}
                      className="px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer"
                      style={{ backgroundColor: 'var(--color-warning)', color: 'var(--color-surface)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-warning)'}
                    >
                      Uygula
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div 
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div 
            className="p-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <RefreshCw className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
              İşlem Geçmişi
            </h3>
            <button
              onClick={fetchJobsCallback}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-alt)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-subtle)' }} />
              <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Henüz işlem yapılmamış</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>SEO analizi veya link kontrolü başlatmak için Toplu Analiz sekmesine gidin.</p>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--color-border)' }}>
              {jobs.map((job) => (
                <div 
                  key={job.id} 
                  className="p-4 transition-colors"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(63, 63, 70, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getJobStatusIcon(job.status)}</div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: 'var(--color-text)' }} className="font-medium">{getJobTypeLabel(job.job_type)}</span>
                        <span 
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={
                            job.status === 'completed' ? { backgroundColor: 'rgba(74, 222, 128, 0.2)', color: 'var(--color-success)' } :
                            job.status === 'running' ? { backgroundColor: 'rgba(251, 191, 36, 0.2)', color: 'var(--color-warning)' } :
                            job.status === 'failed' ? { backgroundColor: 'rgba(248, 113, 113, 0.2)', color: 'var(--color-error)' } :
                            { backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }
                          }
                        >
                          {job.status === 'completed' ? 'Tamamlandı' :
                           job.status === 'running' ? 'Çalışıyor' :
                           job.status === 'failed' ? 'Başarısız' :
                           job.status === 'pending' ? 'Bekliyor' : job.status}
                        </span>
                      </div>
                      
                      <div className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(job.created_at).toLocaleString('tr-TR')}
                      </div>
                      
                      {job.status === 'running' && job.total_items > 0 && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                            <span>İlerleme</span>
                            <span>{job.processed_items} / {job.total_items}</span>
                          </div>
                          <div 
                            className="w-full h-2 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--color-border)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${(job.processed_items / job.total_items) * 100}%`,
                                backgroundColor: 'var(--color-warning)'
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {job.results?.summary && (
                        <div className="flex flex-wrap gap-4 text-sm">
                          {job.results.summary.total_analyzed !== undefined && (
                            <span style={{ color: 'var(--color-text-muted)' }}>
                              <span style={{ color: 'var(--color-text)' }}>{job.results.summary.total_analyzed}</span> analiz
                            </span>
                          )}
                          {job.results.summary.error_count !== undefined && (
                            <span style={{ color: 'var(--color-text-muted)' }}>
                              <span style={{ color: 'var(--color-error)' }}>{job.results.summary.error_count}</span> hata
                            </span>
                          )}
                          {job.results.summary.warning_count !== undefined && (
                            <span style={{ color: 'var(--color-text-muted)' }}>
                              <span style={{ color: 'var(--color-warning)' }}>{job.results.summary.warning_count}</span> uyarı
                            </span>
                          )}
                          {job.results.summary.avg_seo_score !== undefined && (
                            <span style={{ color: 'var(--color-text-muted)' }}>
                              Ortalama SEO: <span style={{ color: 'var(--color-text)' }}>{job.results.summary.avg_seo_score}</span>
                            </span>
                          )}
                          {job.results.summary.broken_links_found !== undefined && (
                            <span style={{ color: 'var(--color-text-muted)' }}>
                              <span style={{ color: 'var(--color-error)' }}>{job.results.summary.broken_links_found}</span> kırık link
                            </span>
                          )}
                          {job.results.summary.suggestions_created !== undefined && (
                            <span style={{ color: 'var(--color-text-muted)' }}>
                              <span style={{ color: 'var(--color-success)' }}>{job.results.summary.suggestions_created}</span> öneri
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
