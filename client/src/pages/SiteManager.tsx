import { useEffect, useState } from 'react';
import { useSiteStore, Site, ConnectionTestResult } from '../store/siteStore';
import { Plus, Globe, Pencil, Trash2, X, Loader2, ExternalLink, CheckCircle, XCircle, Activity } from 'lucide-react';

function SiteForm({ site, onClose, onSave }: { site?: Site | null; onClose: () => void; onSave: (data: Partial<Site>) => Promise<void> }) {
  const [form, setForm] = useState<{
    name: string;
    domain: string;
    platform: 'blogger' | 'wordpress';
    platform_id: string;
    language: string;
    niche: string;
    adsense_status: string;
  }>({
    name: site?.name || '',
    domain: site?.domain || '',
    platform: site?.platform || 'blogger',
    platform_id: site?.platform_id || '',
    language: site?.language || 'tr',
    niche: site?.niche || '',
    adsense_status: site?.adsense_status || 'pending',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); } catch {} finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">{site ? 'Site Düzenle' : 'Yeni Site Ekle'}</h2>
          <button onClick={onClose} className="p-1 text-dark-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1">Site Adı *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Domain</label>
            <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="ornek.com"
              className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Platform *</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as 'blogger' | 'wordpress' })}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none">
                <option value="blogger">Blogger</option>
                <option value="wordpress">WordPress</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Dil</label>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none">
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Platform ID</label>
            <input value={form.platform_id} onChange={(e) => setForm({ ...form, platform_id: e.target.value })}
              placeholder={form.platform === 'blogger' ? 'Blogger Blog ID' : 'WordPress Site URL'}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Niş</label>
            <input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="finans, sağlık, teknoloji..."
              className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">AdSense Durumu</label>
            <select value={form.adsense_status} onChange={(e) => setForm({ ...form, adsense_status: e.target.value })}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none">
              <option value="pending">Beklemede</option>
              <option value="applied">Başvuru Yapıldı</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {site ? 'Güncelle' : 'Site Ekle'}
          </button>
        </form>
      </div>
    </div>
  );
}

const platformColors: Record<string, string> = { blogger: 'bg-orange-500', wordpress: 'bg-sky-500' };
const adsenseColors: Record<string, string> = { pending: 'text-dark-400', applied: 'text-yellow-400', approved: 'text-emerald-400', rejected: 'text-red-400' };
const adsenseLabels: Record<string, string> = { pending: 'Beklemede', applied: 'Başvuruldu', approved: 'Onaylı', rejected: 'Reddedildi' };

interface TestStatus {
  siteId: number;
  loading: boolean;
  result: ConnectionTestResult | null;
  error: { code: string; message: string } | null;
}

export default function SiteManager() {
  const { sites, isLoading, fetchSites, createSite, updateSite, deleteSite, testConnection } = useSiteStore();
  const [showForm, setShowForm] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [testStatuses, setTestStatuses] = useState<Record<number, TestStatus>>({});

  useEffect(() => { fetchSites(); }, []);

  const handleSave = async (data: Partial<Site>) => {
    if (editSite) await updateSite(editSite.id, data);
    else await createSite(data);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bu siteyi silmek istediğinize emin misiniz?')) await deleteSite(id);
  };

  const handleTestConnection = async (siteId: number) => {
    setTestStatuses(prev => ({
      ...prev,
      [siteId]: { siteId, loading: true, result: null, error: null }
    }));

    try {
      const result = await testConnection(siteId);
      setTestStatuses(prev => ({
        ...prev,
        [siteId]: { siteId, loading: false, result, error: null }
      }));
    } catch (error: any) {
      const errorData = error.response?.data?.error || { code: 'UNKNOWN_ERROR', message: 'Bir hata oluştu' };
      setTestStatuses(prev => ({
        ...prev,
        [siteId]: { siteId, loading: false, result: null, error: errorData }
      }));
    }
  };

  const getTestStatus = (siteId: number): TestStatus | undefined => {
    return testStatuses[siteId];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Site Yönetimi</h1>
          <p className="text-dark-400 mt-1">Blogger ve WordPress sitelerinizi yönetin</p>
        </div>
        <button onClick={() => { setEditSite(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Yeni Site
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
      ) : sites.length === 0 ? (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
          <Globe className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-300">Henüz site eklenmemiş</h3>
          <p className="text-dark-500 mt-1">İlk sitenizi ekleyerek başlayın</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => {
            const testStatus = getTestStatus(site.id);
            return (
              <div key={site.id} className="bg-dark-900 border border-dark-700 rounded-xl p-5 hover:border-dark-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${platformColors[site.platform] || 'bg-dark-600'}`}>
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{site.name}</h3>
                      {site.domain && (
                        <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-dark-400 hover:text-primary-400 flex items-center gap-1">
                          {site.domain} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditSite(site); setShowForm(true); }}
                      className="p-1.5 text-dark-400 hover:text-primary-400 hover:bg-dark-800 rounded-lg transition-colors cursor-pointer">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(site.id)}
                      className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-dark-800 text-dark-300 capitalize">{site.platform}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-dark-800 text-dark-300 uppercase">{site.language}</span>
                  {site.niche && <span className="text-xs px-2 py-1 rounded-full bg-dark-800 text-dark-300">{site.niche}</span>}
                  <span className={`text-xs px-2 py-1 rounded-full bg-dark-800 ${adsenseColors[site.adsense_status] || 'text-dark-400'}`}>
                    AdSense: {adsenseLabels[site.adsense_status] || site.adsense_status}
                  </span>
                </div>
                {!site.is_active && (
                  <div className="mt-3 text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg">Pasif</div>
                )}
                
                {/* Test Connection Button */}
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <button
                    onClick={() => handleTestConnection(site.id)}
                    disabled={testStatus?.loading}
                    aria-label={`${site.name} için bağlantıyı test et`}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900"
                  >
                    {testStatus?.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Test Ediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" />
                        <span>Bağlantıyı Test Et</span>
                      </>
                    )}
                  </button>
                  
                  {/* Success Message */}
                  {testStatus?.result && (
                    <div 
                      role="alert"
                      className="mt-3 flex items-start gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{testStatus.result.message}</span>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {testStatus?.error && (
                    <div 
                      role="alert"
                      className="mt-3 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg"
                    >
                      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{testStatus.error.message}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <SiteForm site={editSite} onClose={() => setShowForm(false)} onSave={handleSave} />}
    </div>
  );
}
