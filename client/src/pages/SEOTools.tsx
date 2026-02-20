import { useState, useEffect } from 'react';
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

export default function SEOTools() {
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

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (activeTab === 'links') {
      fetchBrokenLinks();
    } else if (activeTab === 'suggestions') {
      fetchSuggestions();
    }
  }, [activeTab]);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/bulk-seo/jobs');
      setJobs(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch jobs');
    }
  };

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
      await fetchJobs();
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
      await fetchJobs();
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
      await fetchJobs();
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
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <RefreshCw className="w-5 h-5 text-slate-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
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
        <h1 className="text-2xl font-bold text-white">SEO Araçları</h1>
        <p className="text-dark-400 mt-1">Makalelerinizin SEO performansını analiz edin ve linkleri kontrol edin</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
          <button 
            onClick={() => setError('')} 
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700">
        {[
          { id: 'analysis', label: 'Toplu Analiz', icon: BarChart3 },
          { id: 'links', label: 'Kırık Linkler', icon: LinkIcon },
          { id: 'suggestions', label: 'Link Önerileri', icon: Lightbulb },
          { id: 'jobs', label: 'İşlemler', icon: RefreshCw },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-dark-400 hover:text-dark-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              Toplu SEO Analizi
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Site</label>
                <input
                  type="text"
                  value={filters.site_id}
                  onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
                  placeholder="Site ID"
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Durum</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">Tümü</option>
                  <option value="draft">Taslak</option>
                  <option value="published">Yayında</option>
                  <option value="scheduled">Planlanmış</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Dil</label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Analiz Başlat
              </button>
              
              <button
                onClick={startLinkChecker}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                Link Kontrolü
              </button>
              
              <button
                onClick={startLinkSuggestions}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                Link Önerileri
              </button>
            </div>
          </div>

          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-amber-400" />
              Rapor İndir
            </h3>
            
            <p className="text-dark-400 text-sm mb-4">
              Tüm makalelerin SEO analiz raporunu JSON veya CSV formatında indirin.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => exportReport('json')}
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors"
              >
                <FileText className="w-4 h-4" />
                JSON İndir
              </button>
              
              <button
                onClick={() => exportReport('csv')}
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors"
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
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-red-400" />
              Kırık Linkler
              <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                {brokenLinks.length}
              </span>
            </h3>
            <button
              onClick={fetchBrokenLinks}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-dark-400" />
            </button>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
              <p className="text-dark-400">Yükleniyor...</p>
            </div>
          ) : brokenLinks.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-dark-300 font-medium">Kırık link bulunamadı!</p>
              <p className="text-dark-500 text-sm mt-1">Tüm linkler çalışıyor gibi görünüyor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Makale</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Link</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Tip</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Kontrol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {brokenLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-dark-800/50">
                      <td className="px-4 py-3">
                        <span className="text-white text-sm">{link.article_title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1"
                        >
                          {link.url.substring(0, 50)}
                          {link.url.length > 50 && '...'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {link.anchor_text && (
                          <p className="text-dark-500 text-xs mt-1">"{link.anchor_text}"</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          link.link_type === 'internal'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {link.link_type === 'internal' ? 'İç' : 'Dış'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-red-400 text-sm">
                          {link.status_code || 'Hata'}
                        </span>
                        {link.error_message && (
                          <p className="text-dark-500 text-xs">{link.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-dark-400 text-sm">
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
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              İç Link Önerileri
              <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                {suggestions.length}
              </span>
            </h3>
            <button
              onClick={fetchSuggestions}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-dark-400" />
            </button>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
              <p className="text-dark-400">Yükleniyor...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 text-dark-500 mx-auto mb-4" />
              <p className="text-dark-300 font-medium">Öneri bulunamadı</p>
              <p className="text-dark-500 text-sm mt-1">Link önerileri oluşturmak için "Link Önerileri" butonunu kullanın.</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="p-4 hover:bg-dark-800/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-medium">{suggestion.source_title}</span>
                        <span className="text-dark-500">→</span>
                        <span className="text-amber-400">{suggestion.target_title}</span>
                      </div>
                      
                      {suggestion.context_snippet && (
                        <p className="text-dark-400 text-sm bg-dark-800 p-2 rounded">
                          ...{suggestion.context_snippet}...
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-dark-500">Önerilen metin:</span>
                          <span className="text-xs text-dark-300">"{suggestion.suggested_anchor_text}"</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-dark-500">Relevans:</span>
                          <div className="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${suggestion.relevance_score}%` }}
                            />
                          </div>
                          <span className="text-xs text-dark-400">{suggestion.relevance_score}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => applySuggestion(suggestion.id)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors"
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
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              İşlem Geçmişi
            </h3>
            <button
              onClick={fetchJobs}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-dark-400" />
            </button>
          </div>
          
          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 text-dark-500 mx-auto mb-4" />
              <p className="text-dark-300 font-medium">Henüz işlem yapılmamış</p>
              <p className="text-dark-500 text-sm mt-1">SEO analizi veya link kontrolü başlatmak için Toplu Analiz sekmesine gidin.</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 hover:bg-dark-800/50">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getJobStatusIcon(job.status)}</div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{getJobTypeLabel(job.job_type)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          job.status === 'running' ? 'bg-amber-500/20 text-amber-400' :
                          job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-dark-700 text-dark-400'
                        }`}>
                          {job.status === 'completed' ? 'Tamamlandı' :
                           job.status === 'running' ? 'Çalışıyor' :
                           job.status === 'failed' ? 'Başarısız' :
                           job.status === 'pending' ? 'Bekliyor' : job.status}
                        </span>
                      </div>
                      
                      <div className="text-dark-400 text-sm mb-2">
                        {new Date(job.created_at).toLocaleString('tr-TR')}
                      </div>
                      
                      {job.status === 'running' && job.total_items > 0 && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-dark-400 mb-1">
                            <span>İlerleme</span>
                            <span>{job.processed_items} / {job.total_items}</span>
                          </div>
                          <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: `${(job.processed_items / job.total_items) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {job.results?.summary && (
                        <div className="flex flex-wrap gap-4 text-sm">
                          {job.results.summary.total_analyzed !== undefined && (
                            <span className="text-dark-400">
                              <span className="text-white">{job.results.summary.total_analyzed}</span> analiz
                            </span>
                          )}
                          {job.results.summary.error_count !== undefined && (
                            <span className="text-dark-400">
                              <span className="text-red-400">{job.results.summary.error_count}</span> hata
                            </span>
                          )}
                          {job.results.summary.warning_count !== undefined && (
                            <span className="text-dark-400">
                              <span className="text-amber-400">{job.results.summary.warning_count}</span> uyarı
                            </span>
                          )}
                          {job.results.summary.avg_seo_score !== undefined && (
                            <span className="text-dark-400">
                              Ortalama SEO: <span className="text-white">{job.results.summary.avg_seo_score}</span>
                            </span>
                          )}
                          {job.results.summary.broken_links_found !== undefined && (
                            <span className="text-dark-400">
                              <span className="text-red-400">{job.results.summary.broken_links_found}</span> kırık link
                            </span>
                          )}
                          {job.results.summary.suggestions_created !== undefined && (
                            <span className="text-dark-400">
                              <span className="text-emerald-400">{job.results.summary.suggestions_created}</span> öneri
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
