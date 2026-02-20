import { useEffect, useState } from 'react';
import { Globe, FileText, Send, TrendingUp, Eye, BarChart3 } from 'lucide-react';
import api from '../services/api';

interface Stats {
  totalSites: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  avgSeoScore: number;
  topTrends: any[];
  recentArticles: any[];
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-dark-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalSites: 0, totalArticles: 0, publishedArticles: 0,
    draftArticles: 0, avgSeoScore: 0, topTrends: [], recentArticles: [],
  });

  useEffect(() => {
    Promise.all([
      api.get('/sites').catch(() => ({ data: [] })),
      api.get('/articles?limit=5').catch(() => ({ data: { data: [], total: 0 } })),
      api.get('/trends?limit=5').catch(() => ({ data: [] })),
    ]).then(([sitesRes, articlesRes, trendsRes]) => {
      const sites = sitesRes.data;
      const articles = articlesRes.data;
      const allArticles = articles.data || [];
      setStats({
        totalSites: Array.isArray(sites) ? sites.length : 0,
        totalArticles: articles.total || 0,
        publishedArticles: allArticles.filter((a: any) => a.status === 'published').length,
        draftArticles: allArticles.filter((a: any) => a.status === 'draft').length,
        avgSeoScore: allArticles.length
          ? Math.round(allArticles.reduce((sum: number, a: any) => sum + (a.seo_score || 0), 0) / allArticles.length)
          : 0,
        topTrends: Array.isArray(trendsRes.data) ? trendsRes.data : [],
        recentArticles: allArticles,
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-dark-400 mt-1">Genel bakış ve istatistikler</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Globe} label="Toplam Site" value={stats.totalSites} color="bg-blue-600" />
        <StatCard icon={FileText} label="Toplam Makale" value={stats.totalArticles} color="bg-emerald-600" />
        <StatCard icon={Send} label="Yayınlanan" value={stats.publishedArticles} color="bg-purple-600" />
        <StatCard icon={BarChart3} label="Ort. SEO Skoru" value={stats.avgSeoScore} color="bg-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-400" /> Son Makaleler
          </h2>
          {stats.recentArticles.length === 0 ? (
            <p className="text-dark-500 text-sm">Henüz makale yok</p>
          ) : (
            <div className="space-y-3">
              {stats.recentArticles.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
                  <div>
                    <p className="text-sm text-white">{a.title}</p>
                    <p className="text-xs text-dark-500">{a.site_name || 'Site atanmamış'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    a.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' :
                    a.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-dark-700 text-dark-400'
                  }`}>
                    {a.status === 'published' ? 'Yayında' : a.status === 'scheduled' ? 'Zamanlandı' : 'Taslak'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Top Trendler
          </h2>
          {stats.topTrends.length === 0 ? (
            <p className="text-dark-500 text-sm">Henüz trend verisi yok</p>
          ) : (
            <div className="space-y-3">
              {stats.topTrends.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
                  <p className="text-sm text-white">{t.topic}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">{t.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
