import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  FileText,
  Send,
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  Plus,
  Compass,
  ExternalLink,
  ChevronRight,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import api from '../services/api';
import type { Article, Site, Trend } from '../types';

interface DashboardStats {
  totalSites: number;
  totalArticles: number;
  publishedThisMonth: number;
  scheduledCount: number;
  avgSeoScore: number;
}

interface ActivityData {
  date: string;
  published: number;
}

interface AdSenseStatus {
  siteId: number;
  siteName: string;
  status: 'approved' | 'pending' | 'rejected' | 'not_configured';
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="bg-surface-alt border border-border rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-2xl font-bold text-text mt-1 font-variant-numeric tabular-nums">
            {value}
          </p>
          {trend && (
            <p
              className={`text-xs mt-1 ${
                trend.value >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
        >
          <Icon className="w-6 h-6 text-surface" />
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'primary',
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
}) {
  const variantClasses = {
    primary:
      'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 border-primary-500/20',
    secondary:
      'bg-surface text-text-muted hover:text-text hover:bg-surface-elevated border-border',
    accent:
      'bg-accent-500/10 text-accent-400 hover:bg-accent-500/20 border-accent-500/20',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 w-full text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${variantClasses[variant]}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium text-sm">{label}</span>
      <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 opacity-50" />
    </button>
  );
}

function AdSenseStatusCard({ status }: { status: AdSenseStatus }) {
  const statusConfig = {
    approved: {
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
      label: 'Onaylı',
    },
    pending: {
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      label: 'Beklemede',
    },
    rejected: {
      icon: XCircle,
      color: 'text-error',
      bgColor: 'bg-error/10',
      label: 'Reddedildi',
    },
    not_configured: {
      icon: AlertCircle,
      color: 'text-text-muted',
      bgColor: 'bg-surface',
      label: 'Yapılandırılmamış',
    },
  };

  const config = statusConfig[status.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
          <Globe className="w-4 h-4 text-text-muted" />
        </div>
        <span className="text-sm text-text">{status.siteName}</span>
      </div>
      <div className={`flex items-center gap-1.5 ${config.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    </div>
  );
}

function TrendItem({ trend, index }: { trend: Trend; index: number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border-subtle last:border-0">
      <div className="flex items-center gap-3">
        <span
          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
            index === 0
              ? 'bg-warning/20 text-warning'
              : index === 1
              ? 'bg-text-muted/20 text-text-muted'
              : index === 2
              ? 'bg-accent-500/20 text-accent-400'
              : 'bg-surface text-text-subtle'
          }`}
        >
          {index + 1}
        </span>
        <span className="text-sm text-text truncate max-w-[180px]">{trend.topic}</span>
      </div>
      <span className="text-xs px-2 py-1 rounded-full bg-primary-500/10 text-primary-400 font-variant-numeric tabular-nums">
        {trend.score.toLocaleString()}
      </span>
    </div>
  );
}

function ArticleItem({ article }: { article: Article }) {
  const navigate = useNavigate();

  const statusConfig = {
    published: {
      bg: 'bg-success/10',
      text: 'text-success',
      label: 'Yayında',
    },
    scheduled: {
      bg: 'bg-primary-500/10',
      text: 'text-primary-400',
      label: 'Zamanlandı',
    },
    draft: {
      bg: 'bg-surface',
      text: 'text-text-muted',
      label: 'Taslak',
    },
    review: {
      bg: 'bg-warning/10',
      text: 'text-warning',
      label: 'İncelemede',
    },
  };

  const config = statusConfig[article.status] || statusConfig.draft;

  return (
    <div
      onClick={() => navigate(`/content?article=${article.id}`)}
      className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0 cursor-pointer hover:bg-surface/50 transition-colors duration-150 -mx-2 px-2 rounded-lg"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text truncate">{article.title}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {article.site_name || 'Site atanmamış'} •{' '}
          {article.published_at
            ? new Date(article.published_at).toLocaleDateString('tr-TR')
            : new Date(article.created_at).toLocaleDateString('tr-TR')}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <span
          className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}
        >
          {config.label}
        </span>
        {article.published_url && (
          <a
            href={article.published_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-md hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Makaleyi görüntüle"
          >
            <ExternalLink className="w-4 h-4 text-text-muted" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalSites: 0,
    totalArticles: 0,
    publishedThisMonth: 0,
    scheduledCount: 0,
    avgSeoScore: 0,
  });
  const [activity7Days, setActivity7Days] = useState<ActivityData[]>([]);
  const [activity30Days, setActivity30Days] = useState<ActivityData[]>([]);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [topTrends, setTopTrends] = useState<Trend[]>([]);
  const [adSenseStatuses, setAdSenseStatuses] = useState<AdSenseStatus[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d'>('7d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [
          sitesRes,
          articlesRes,
          scheduledRes,
          trendsRes,
          historyRes,
        ] = await Promise.all([
          api.get('/sites').catch(() => ({ data: [] })),
          api.get('/articles?limit=100').catch(() => ({ data: { data: [], total: 0 } })),
          api.get('/scheduler/queue?status=scheduled').catch(() => ({ data: { data: [], total: 0 } })),
          api.get('/trends?limit=5').catch(() => ({ data: [] })),
          api.get('/scheduler/history?limit=100').catch(() => ({ data: { data: [] } })),
        ]);

        const sites: Site[] = Array.isArray(sitesRes.data) ? sitesRes.data : [];
        const articles: Article[] = articlesRes.data?.data || [];
        const scheduled = scheduledRes.data?.data || [];
        const trends: Trend[] = Array.isArray(trendsRes.data) ? trendsRes.data : [];
        const history = historyRes.data?.data || [];

        // Calculate stats
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const publishedThisMonth = articles.filter(
          (a) => a.status === 'published' && a.published_at && new Date(a.published_at) >= startOfMonth
        ).length;

        const avgSeoScore = articles.length
          ? Math.round(
              articles.reduce((sum, a) => sum + (a.seo_score || 0), 0) / articles.length
            )
          : 0;

        setStats({
          totalSites: sites.length,
          totalArticles: articlesRes.data?.total || articles.length,
          publishedThisMonth,
          scheduledCount: scheduled.length,
          avgSeoScore,
        });

        // Generate activity data for charts
        const generateActivityData = (days: number): ActivityData[] => {
          const data: ActivityData[] = [];
          for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayStart = new Date(dateStr);
            const dayEnd = new Date(dateStr);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const count = history.filter((h: { published_at: string }) => {
              const pubDate = new Date(h.published_at);
              return pubDate >= dayStart && pubDate < dayEnd;
            }).length;

            data.push({
              date: days === 7 ? date.toLocaleDateString('tr-TR', { weekday: 'short' }) : `${date.getDate()}`,
              published: count,
            });
          }
          return data;
        };

        setActivity7Days(generateActivityData(7));
        setActivity30Days(generateActivityData(30));

        // Recent published articles
        const publishedArticles = articles
          .filter((a) => a.status === 'published')
          .sort((a, b) => {
            const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
            const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 5);

        setRecentArticles(publishedArticles);

        // Top trends
        setTopTrends(trends.slice(0, 5));

        // AdSense status by site
        const adSenseData: AdSenseStatus[] = sites.map((site) => ({
          siteId: site.id,
          siteName: site.name,
          status: (site.adsense_status as AdSenseStatus['status']) || 'not_configured',
        }));
        setAdSenseStatuses(adSenseData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const currentActivityData = chartPeriod === '7d' ? activity7Days : activity30Days;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
          <div className="h-4 w-64 bg-surface-elevated rounded mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-elevated rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-80 bg-surface-elevated rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-text-muted mt-1">Genel bakış ve istatistikler</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickActionButton
          icon={Plus}
          label="Yeni Makale"
          onClick={() => navigate('/content')}
          variant="primary"
        />
        <QuickActionButton
          icon={Calendar}
          label="Yayın Planla"
          onClick={() => navigate('/publisher')}
          variant="accent"
        />
        <QuickActionButton
          icon={Compass}
          label="Trend Keşif"
          onClick={() => navigate('/trends')}
          variant="secondary"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Globe}
          label="Toplam Site"
          value={stats.totalSites}
          color="bg-primary-500"
        />
        <StatCard
          icon={FileText}
          label="Toplam Makale"
          value={stats.totalArticles}
          color="bg-accent-500"
        />
        <StatCard
          icon={Send}
          label="Bu Ay Yayınlanan"
          value={stats.publishedThisMonth}
          color="bg-success"
        />
        <StatCard
          icon={Clock}
          label="Zamanlanmış"
          value={stats.scheduledCount}
          color="bg-warning"
        />
      </div>

      {/* Charts and Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-surface-alt border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              Yayın Aktivitesi
            </h2>
            <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
              <button
                onClick={() => setChartPeriod('7d')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-400 ${
                  chartPeriod === '7d'
                    ? 'bg-primary-500 text-surface'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                7 Gün
              </button>
              <button
                onClick={() => setChartPeriod('30d')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-400 ${
                  chartPeriod === '30d'
                    ? 'bg-primary-500 text-surface'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                30 Gün
              </button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentActivityData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                />
                <YAxis
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text)',
                  }}
                  cursor={{ fill: 'var(--color-surface)' }}
                />
                <Bar
                  dataKey="published"
                  fill="var(--color-primary-400)"
                  radius={[4, 4, 0, 0]}
                  name="Yayınlanan"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Trends */}
        <div className="bg-surface-alt border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-400" />
            Top 5 Trend
          </h2>
          {topTrends.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-text-subtle mx-auto mb-3" />
              <p className="text-text-muted text-sm">Henüz trend verisi yok</p>
              <button
                onClick={() => navigate('/trends')}
                className="mt-3 text-sm text-primary-400 hover:text-primary-300 cursor-pointer"
              >
                Trendleri keşfet
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {topTrends.map((trend, index) => (
                <TrendItem key={trend.id} trend={trend} index={index} />
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/trends')}
            className="mt-4 w-full py-2 text-sm text-primary-400 hover:text-primary-300 border border-primary-500/20 rounded-lg hover:bg-primary-500/5 transition-colors cursor-pointer"
          >
            Tüm Trendleri Gör
          </button>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Articles */}
        <div className="bg-surface-alt border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Son Yayınlanan Makaleler
            </h2>
            <button
              onClick={() => navigate('/content')}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 cursor-pointer"
            >
              Tümünü Gör
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {recentArticles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-text-subtle mx-auto mb-3" />
              <p className="text-text-muted text-sm">Henüz yayınlanmış makale yok</p>
              <button
                onClick={() => navigate('/content')}
                className="mt-3 text-sm text-primary-400 hover:text-primary-300 cursor-pointer"
              >
                İlk makaleyi oluştur
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {recentArticles.map((article) => (
                <ArticleItem key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>

        {/* AdSense Status */}
        <div className="bg-surface-alt border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent-400" />
              AdSense Durumu
            </h2>
            <button
              onClick={() => navigate('/sites')}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 cursor-pointer"
            >
              Siteleri Yönet
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {adSenseStatuses.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="w-12 h-12 text-text-subtle mx-auto mb-3" />
              <p className="text-text-muted text-sm">Henüz site eklenmemiş</p>
              <button
                onClick={() => navigate('/sites')}
                className="mt-3 text-sm text-primary-400 hover:text-primary-300 cursor-pointer"
              >
                İlk siteyi ekle
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {adSenseStatuses.map((status) => (
                <AdSenseStatusCard key={status.siteId} status={status} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
