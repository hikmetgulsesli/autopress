import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format } from 'date-fns';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { tr } from 'date-fns/locale';
import {
  Send,
  Calendar as CalendarIcon,
  List,
  History,
  Plus,
  X,
  Clock,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import api from '../services/api';
import { notify } from '../utils/toast.tsx';
import { Article, Site, PublishHistory, PublishQueueItem } from '../types';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { tr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: PublishQueueItem;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: ScheduleData) => void;
  articles: Article[];
  sites: Site[];
}

interface ScheduleData {
  articleId: number;
  siteId: number;
  platform: 'wordpress' | 'blogger';
  scheduledAt: string;
}

function ScheduleModal({ isOpen, onClose, onSchedule, articles, sites }: ScheduleModalProps) {
  const [selectedArticle, setSelectedArticle] = useState<number | ''>('');
  const [selectedSite, setSelectedSite] = useState<number | ''>('');
  const [platform, setPlatform] = useState<'wordpress' | 'blogger'>('wordpress');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle || !selectedSite || !date) return;

    setIsSubmitting(true);
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    await onSchedule({
      articleId: Number(selectedArticle),
      siteId: Number(selectedSite),
      platform,
      scheduledAt,
    });
    setIsSubmitting(false);
    onClose();
  };

  const selectedSiteObj = sites.find((s) => s.id === Number(selectedSite));

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
    >
      <div className="bg-surface-alt border border-border rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 id="schedule-modal-title" className="text-xl font-bold text-text">
            Makale Zamanla
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="article" className="block text-sm font-medium text-text mb-2">
              Makale
            </label>
            <select
              id="article"
              value={selectedArticle}
              onChange={(e) => setSelectedArticle(Number(e.target.value))}
              className="input"
              required
            >
              <option value="">Makale seçin</option>
              {articles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="site" className="block text-sm font-medium text-text mb-2">
              Site
            </label>
            <select
              id="site"
              value={selectedSite}
              onChange={(e) => setSelectedSite(Number(e.target.value))}
              className="input"
              required
            >
              <option value="">Site seçin</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.domain})
                </option>
              ))}
            </select>
          </div>

          {selectedSiteObj && (
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-text mb-2">
                Platform
              </label>
              <select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as 'wordpress' | 'blogger')}
                className="input"
                required
              >
                <option value="wordpress">WordPress</option>
                <option value="blogger">Blogger</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-text mb-2">
                Tarih
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-text mb-2">
                Saat
              </label>
              <input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedArticle || !selectedSite || !date}
              className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Zamanlanıyor...' : 'Zamanla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Publisher() {
  const [activeTab, setActiveTab] = useState<'queue' | 'calendar' | 'history'>('queue');
  const [queue, setQueue] = useState<PublishQueueItem[]>([]);
  const [history, setHistory] = useState<PublishHistory[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<View>('month');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [queueRes, historyRes, articlesRes, sitesRes] = await Promise.all([
        api.get('/publish/queue'),
        api.get('/publish/history'),
        api.get('/articles?status=draft'),
        api.get('/sites'),
      ]);
      setQueue(queueRes.data || []);
      setHistory(historyRes.data || []);
      setArticles(articlesRes.data?.data || []);
      setSites(sitesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch publisher data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSchedule = async (data: ScheduleData) => {
    try {
      await api.post('/publish/schedule', data);
      notify.success('Makale başarıyla zamanlandı');
      fetchData();
    } catch (err) {
      console.error('Failed to schedule article:', err);
      notify.error('Makale zamanlanırken bir hata oluştu');
    }
  };

  const handleCancelSchedule = async (articleId: number) => {
    if (!confirm('Bu zamanlanmış yayını iptal etmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/publish/schedule/${articleId}`);
      notify.success('Zamanlama iptal edildi');
      fetchData();
    } catch (err) {
      console.error('Failed to cancel schedule:', err);
      notify.error('Zamanlama iptal edilirken bir hata oluştu');
    }
  };

  const handleReschedule = async (articleId: number, newDate: string) => {
    try {
      await api.patch(`/publish/schedule/${articleId}`, { scheduledAt: newDate });
      notify.success('Yeniden zamanlama başarılı');
      fetchData();
    } catch (err) {
      console.error('Failed to reschedule:', err);
      notify.error('Yeniden zamanlama yapılırken bir hata oluştu');
    }
  };

  const calendarEvents: CalendarEvent[] = queue.map((item) => ({
    id: item.id,
    title: item.title,
    start: new Date(item.scheduled_at),
    end: new Date(new Date(item.scheduled_at).getTime() + 60 * 60 * 1000),
    resource: item,
  }));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-text-muted" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Başarılı';
      case 'failed':
        return 'Başarısız';
      case 'pending':
        return 'Bekliyor';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Yayıncı</h1>
          <p className="text-text-muted mt-1">Makalelerinizi zamanlayın ve yayınlayın</p>
        </div>
        <button
          onClick={() => setIsScheduleModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Zamanla
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-alt border border-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'queue'
              ? 'bg-primary-400 text-white'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <List className="w-4 h-4" />
          Kuyruk
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'calendar'
              ? 'bg-primary-400 text-white'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          Takvim
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-primary-400 text-white'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <History className="w-4 h-4" />
          Geçmiş
        </button>
      </div>

      {/* Queue View */}
      {activeTab === 'queue' && (
        <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text">Yayın Kuyruğu</h2>
            <p className="text-sm text-text-muted">
              Zamanlanmış ve bekleyen yayınlar
            </p>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-text-muted animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Yükleniyor...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="p-12 text-center">
              <Send className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted">Henüz zamanlanmış yayın yok</p>
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="btn btn-primary mt-4"
              >
                <Plus className="w-4 h-4" />
                İlk Yayını Zamanla
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-surface/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text truncate">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {item.site_name || 'Site atanmamış'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(item.scheduled_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            item.platform === 'wordpress'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}
                        >
                          {item.platform === 'wordpress' ? 'WordPress' : 'Blogger'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleCancelSchedule(item.id)}
                        className="p-2 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-colors"
                        aria-label="İptal et"
                        title="İptal et"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div className="bg-surface-alt border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text">Yayın Takvimi</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCalendarDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; })
                }
                className="p-2 hover:bg-surface rounded-lg transition-colors"
                aria-label="Önceki ay"
              >
                <ChevronLeft className="w-5 h-5 text-text-muted" />
              </button>
              <span className="text-sm font-medium text-text min-w-[120px] text-center">
                {format(calendarDate, 'MMMM yyyy', { locale: tr })}
              </span>
              <button
                onClick={() =>
                  setCalendarDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; })
                }
                className="p-2 hover:bg-surface rounded-lg transition-colors"
                aria-label="Sonraki ay"
              >
                <ChevronRight className="w-5 h-5 text-text-muted" />
              </button>
            </div>
          </div>

          <div className="h-[600px]">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              view={calendarView}
              onView={setCalendarView}
              date={calendarDate}
              onNavigate={setCalendarDate}
              culture="tr"
              messages={{
                today: 'Bugün',
                previous: 'Önceki',
                next: 'Sonraki',
                month: 'Ay',
                week: 'Hafta',
                day: 'Gün',
                agenda: 'Ajanda',
                date: 'Tarih',
                time: 'Saat',
                event: 'Etkinlik',
                noEventsInRange: 'Bu aralıkta yayın yok',
              }}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: event.resource.platform === 'wordpress' ? '#3b82f6' : '#f97316',
                  borderRadius: '4px',
                  border: 'none',
                },
              })}
              components={{
                event: ({ event }) => (
                  <div className="text-xs truncate">
                    {event.title}
                  </div>
                ),
              }}
            />
          </div>
        </div>
      )}

      {/* History View */}
      {activeTab === 'history' && (
        <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text">Yayın Geçmişi</h2>
            <p className="text-sm text-text-muted">
              Son 50 yayın kaydı
            </p>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-text-muted animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Yükleniyor...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted">Henüz yayın geçmişi yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">
                      Makale
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">
                      Site
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">
                      Platform
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">
                      Durum
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">
                      Tarih
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm text-text font-medium">
                          {item.article_title || 'Bilinmeyen makale'}
                        </p>
                        {item.error_message && (
                          <p className="text-xs text-rose-400 mt-1">
                            {item.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-muted">
                          {item.site_name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            item.platform === 'wordpress'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}
                        >
                          {item.platform === 'wordpress' ? 'WordPress' : 'Blogger'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className="text-sm text-text">
                            {getStatusText(item.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-muted">
                          {(() => { try { const d = new Date(item.published_at); return isNaN(d.getTime()) ? '-' : format(d, 'dd MMM yyyy HH:mm', { locale: tr }); } catch { return '-'; } })()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={handleSchedule}
        articles={articles}
        sites={sites}
      />
    </div>
  );
}
