import { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Settings as SettingsIcon, 
  Bell, 
  Shield,
  Mail,
  Smartphone,
  CheckCircle,
  XCircle,
  TrendingUp,
  Save,
  Loader2,
  Globe,
  Brain,
  Clock,
  FileText,
  Key,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import type { GeneralSettings, ApiKeys, NotificationSettings } from '../types';

type TabId = 'general' | 'apikeys' | 'notifications' | 'security';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'general', label: 'Genel', icon: <SettingsIcon className="w-4 h-4" /> },
  { id: 'apikeys', label: 'API Anahtarları', icon: <Key className="w-4 h-4" /> },
  { id: 'notifications', label: 'Bildirimler', icon: <Bell className="w-4 h-4" /> },
  { id: 'security', label: 'Güvenlik', icon: <Shield className="w-4 h-4" /> },
];

// Toggle Switch Component
interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

function ToggleSwitch({ 
  id, 
  checked, 
  onChange, 
  disabled = false, 
  label, 
  description,
  icon 
}: ToggleSwitchProps) {
  return (
    <div className="flex items-start justify-between py-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          <label 
            htmlFor={id}
            className="text-base font-medium text-text cursor-pointer"
          >
            {label}
          </label>
          {description && (
            <p className="text-sm text-text-muted mt-1">{description}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full 
          transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 
          focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface
          ${checked ? 'bg-primary-400' : 'bg-surface-alt'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full 
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-6' : 'translate-x-0.5'}
            mt-0.5
          `}
        />
      </button>
    </div>
  );
}

// General Tab Component
function GeneralTab() {
  const [settings, setSettings] = useState<GeneralSettings>({
    language: 'tr',
    ai_model: 'gpt-4o',
    publish_jitter_minutes: 15,
    seo_min_words: 300,
  });
  const [originalSettings, setOriginalSettings] = useState<GeneralSettings>({
    language: 'tr',
    ai_model: 'gpt-4o',
    publish_jitter_minutes: 15,
    seo_min_words: 300,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const languages = [
    { code: 'tr', name: 'Türkçe' },
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
  ];

  const aiModels = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/settings');
      const data = response.data;
      const loadedSettings = {
        language: data.language || 'tr',
        ai_model: data.ai_model || 'gpt-4o',
        publish_jitter_minutes: data.publish_jitter_minutes ?? 15,
        seo_min_words: data.seo_min_words ?? 300,
      };
      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ayarlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: keyof GeneralSettings) => {
    try {
      setSaving((prev) => ({ ...prev, [key]: true }));
      setError(null);
      const value = settings[key];
      const type = typeof value === 'number' ? 'number' : 'string';
      await api.put(`/settings/${key}`, { value, type });
      setSaved((prev) => ({ ...prev, [key]: true }));
      setOriginalSettings((prev) => ({ ...prev, [key]: value }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ayar kaydedilirken bir hata oluştu');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const updateSetting = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setSettings((prev: GeneralSettings) => ({ ...prev, [key]: value }));
  };

  const hasChanged = (key: keyof GeneralSettings) => {
    return settings[key] !== originalSettings[key];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" role="status" aria-label="Yükleniyor" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">Genel Ayarlar</h2>
        <p className="text-text-muted mt-1">Uygulama genelinde kullanılan temel ayarları yapılandırın</p>
      </div>
      
      {error && (
        <div role="alert" className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-error flex-shrink-0" />
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      <section className="card space-y-6">
        {/* Language Selector */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex-1">
            <label htmlFor="language" className="block text-sm font-medium text-text mb-2">
              Varsayılan Dil
            </label>
            <div className="flex gap-2">
              <select
                id="language"
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="input flex-1 max-w-md"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => saveSetting('language')}
                disabled={saving['language'] || !hasChanged('language')}
                className="btn btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {saving['language'] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved['language'] ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  'Kaydet'
                )}
              </button>
            </div>
            {saved['language'] && <p className="text-xs text-success mt-1">Kaydedildi</p>}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* AI Model Selector */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
            <Brain className="w-5 h-5 text-accent-400" />
          </div>
          <div className="flex-1">
            <label htmlFor="ai-model" className="block text-sm font-medium text-text mb-2">
              AI Model
            </label>
            <div className="flex gap-2">
              <select
                id="ai-model"
                value={settings.ai_model}
                onChange={(e) => updateSetting('ai_model', e.target.value)}
                className="input flex-1 max-w-md"
              >
                {aiModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
              <button
                onClick={() => saveSetting('ai_model')}
                disabled={saving['ai_model'] || !hasChanged('ai_model')}
                className="btn btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {saving['ai_model'] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved['ai_model'] ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  'Kaydet'
                )}
              </button>
            </div>
            {saved['ai_model'] && <p className="text-xs text-success mt-1">Kaydedildi</p>}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Publish Jitter */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <label htmlFor="publish-jitter" className="block text-sm font-medium text-text mb-2">
              Yayın Jitter Süresi (dakika)
            </label>
            <div className="flex gap-2">
              <input
                id="publish-jitter"
                type="number"
                min={0}
                max={60}
                value={settings.publish_jitter_minutes}
                onChange={(e) => updateSetting('publish_jitter_minutes', parseInt(e.target.value) || 0)}
                className="input flex-1 max-w-md"
              />
              <button
                onClick={() => saveSetting('publish_jitter_minutes')}
                disabled={saving['publish_jitter_minutes'] || !hasChanged('publish_jitter_minutes')}
                className="btn btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {saving['publish_jitter_minutes'] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved['publish_jitter_minutes'] ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  'Kaydet'
                )}
              </button>
            </div>
            {saved['publish_jitter_minutes'] && <p className="text-xs text-success mt-1">Kaydedildi</p>}
            <p className="text-xs text-text-muted mt-1">
              Planlanan yayın zamanına eklenecek rastgele gecikme (0-60 dakika arası)
            </p>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* SEO Min Words */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
            <FileText className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1">
            <label htmlFor="seo-min-words" className="block text-sm font-medium text-text mb-2">
              SEO Minimum Kelime Sayısı
            </label>
            <div className="flex gap-2">
              <input
                id="seo-min-words"
                type="number"
                min={100}
                max={2000}
                value={settings.seo_min_words}
                onChange={(e) => updateSetting('seo_min_words', parseInt(e.target.value) || 300)}
                className="input flex-1 max-w-md"
              />
              <button
                onClick={() => saveSetting('seo_min_words')}
                disabled={saving['seo_min_words'] || !hasChanged('seo_min_words')}
                className="btn btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {saving['seo_min_words'] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved['seo_min_words'] ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  'Kaydet'
                )}
              </button>
            </div>
            {saved['seo_min_words'] && <p className="text-xs text-success mt-1">Kaydedildi</p>}
            <p className="text-xs text-text-muted mt-1">
              SEO uyumlu içerik için minimum kelime sayısı (100-2000 arası)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// API Keys Tab Component
function ApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai_api_key: '',
    unsplash_api_key: '',
    google_trends_api_key: '',
    search_console_client_id: '',
    search_console_client_secret: '',
    search_console_refresh_token: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const apiKeyFields = [
    { key: 'openai_api_key', label: 'OpenAI API Key', placeholder: 'sk-...', description: 'İçerik üretimi için OpenAI API anahtarı' },
    { key: 'unsplash_api_key', label: 'Unsplash API Key', placeholder: 'Unsplash Access Key', description: 'Görsel arama için Unsplash API anahtarı' },
    { key: 'google_trends_api_key', label: 'Google Trends API Key', placeholder: 'API Key', description: 'Trend analizi için Google Trends API anahtarı' },
    { key: 'search_console_client_id', label: 'Search Console Client ID', placeholder: 'Client ID', description: 'Google Search Console OAuth Client ID' },
    { key: 'search_console_client_secret', label: 'Search Console Client Secret', placeholder: 'Client Secret', description: 'Google Search Console OAuth Client Secret' },
    { key: 'search_console_refresh_token', label: 'Search Console Refresh Token', placeholder: 'Refresh Token', description: 'Google Search Console OAuth Refresh Token' },
  ] as const;

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/settings');
      const data = response.data;
      setApiKeys({
        openai_api_key: data.openai_api_key || '',
        unsplash_api_key: data.unsplash_api_key || '',
        google_trends_api_key: data.google_trends_api_key || '',
        search_console_client_id: data.search_console_client_id || '',
        search_console_client_secret: data.search_console_client_secret || '',
        search_console_refresh_token: data.search_console_refresh_token || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'API anahtarları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (key: keyof ApiKeys) => {
    try {
      setSaving((prev) => ({ ...prev, [key]: true }));
      setError(null);
      await api.put(`/settings/${key}`, { value: apiKeys[key], type: 'string' });
      setSaved((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || `${key} kaydedilirken bir hata oluştu`);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const updateApiKey = (key: keyof ApiKeys, value: string) => {
    setApiKeys((prev: ApiKeys) => ({ ...prev, [key]: value }));
  };

  const toggleShowPassword = (key: string) => {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" role="status" aria-label="Yükleniyor" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">API Anahtarları</h2>
        <p className="text-text-muted mt-1">Harici servisler için API anahtarlarınızı yapılandırın</p>
      </div>

      {error && (
        <div role="alert" className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-error flex-shrink-0" />
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      <section className="card">
        <div className="space-y-6">
          {apiKeyFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label htmlFor={field.key} className="block text-sm font-medium text-text">
                {field.label}
              </label>
              <p className="text-xs text-text-muted">{field.description}</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id={field.key}
                    type={showPassword[field.key] ? 'text' : 'password'}
                    value={apiKeys[field.key as keyof ApiKeys]}
                    onChange={(e) => updateApiKey(field.key as keyof ApiKeys, e.target.value)}
                    placeholder={field.placeholder}
                    className="input w-full pr-10"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowPassword(field.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                    aria-label={showPassword[field.key] ? 'Hide' : 'Show'}
                  >
                    {showPassword[field.key] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => saveApiKey(field.key as keyof ApiKeys)}
                  disabled={saving[field.key]}
                  className="btn btn-primary whitespace-nowrap disabled:opacity-50"
                >
                  {saving[field.key] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saved[field.key] ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    'Kaydet'
                  )}
                </button>
              </div>
              {saved[field.key] && (
                <p className="text-xs text-success">Kaydedildi</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card bg-warning/5 border-warning/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-text">Güvenlik Notu</h3>
            <p className="text-sm text-text-muted mt-1">
              API anahtarları sunucuda güvenli bir şekilde saklanır. Anahtarlarınızı kimseyle paylaşmayın ve düzenli olarak yenileyin.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: false, pushEnabled: false, notifyOnPublishSuccess: false, notifyOnPublishFailed: false, notifyOnTrendingTopic: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/settings');
      const data = response.data;
      setSettings({
        emailEnabled: data.emailEnabled ?? false, pushEnabled: data.pushEnabled ?? false,
        notifyOnPublishSuccess: data.notifyOnPublishSuccess ?? false, notifyOnPublishFailed: data.notifyOnPublishFailed ?? false,
        notifyOnTrendingTopic: data.notifyOnTrendingTopic ?? false,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Bildirim ayarları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setSaveStatus('idle');
      setError(null);
      await Promise.all([
        api.put('/settings/emailEnabled', { value: settings.emailEnabled, type: 'boolean' }),
        api.put('/settings/pushEnabled', { value: settings.pushEnabled, type: 'boolean' }),
        api.put('/settings/notifyOnPublishSuccess', { value: settings.notifyOnPublishSuccess, type: 'boolean' }),
        api.put('/settings/notifyOnPublishFailed', { value: settings.notifyOnPublishFailed, type: 'boolean' }),
        api.put('/settings/notifyOnTrendingTopic', { value: settings.notifyOnTrendingTopic, type: 'boolean' }),
      ]);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ayarlar kaydedilirken bir hata oluştu');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings((prev: NotificationSettings) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" role="status" aria-label="Yükleniyor" /></div>);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">Bildirim Ayarları</h2>
        <p className="text-text-muted mt-1">E-posta ve push bildirim tercihlerinizi yönetin</p>
      </div>
      {error && (
        <div role="alert" className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-error flex-shrink-0" />
          <p className="text-error text-sm">{error}</p>
        </div>
      )}
      {saveStatus === 'success' && (
        <div role="alert" className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <p className="text-success text-sm">Ayarlar başarıyla kaydedildi</p>
        </div>
      )}
      <section className="card">
        <h3 className="text-lg font-medium text-text mb-4">Bildirim Kanalları</h3>
        <div className="divide-y divide-border">
          <ToggleSwitch id="emailEnabled" checked={settings.emailEnabled} onChange={(checked) => updateSetting('emailEnabled', checked)} label="E-posta Bildirimleri" description="Önemli olaylar hakkında e-posta alın" icon={<Mail className="w-5 h-5 text-primary-400" />} />
          <ToggleSwitch id="pushEnabled" checked={settings.pushEnabled} onChange={(checked) => updateSetting('pushEnabled', checked)} label="Push Bildirimleri" description="Tarayıcı push bildirimlerini etkinleştirin" icon={<Smartphone className="w-5 h-5 text-accent-400" />} />
        </div>
      </section>
      <section className="card">
        <h3 className="text-lg font-medium text-text mb-4">Bildirim Türleri</h3>
        <div className="divide-y divide-border">
          <ToggleSwitch id="notifyOnPublishSuccess" checked={settings.notifyOnPublishSuccess} onChange={(checked) => updateSetting('notifyOnPublishSuccess', checked)} label="Yayın Başarılı" description="Makale başarıyla yayınlandığında bildirim alın" icon={<CheckCircle className="w-5 h-5 text-success" />} />
          <ToggleSwitch id="notifyOnPublishFailed" checked={settings.notifyOnPublishFailed} onChange={(checked) => updateSetting('notifyOnPublishFailed', checked)} label="Yayın Başarısız" description="Yayınlama başarısız olduğunda bildirim alın" icon={<XCircle className="w-5 h-5 text-error" />} />
          <ToggleSwitch id="notifyOnTrendingTopic" checked={settings.notifyOnTrendingTopic} onChange={(checked) => updateSetting('notifyOnTrendingTopic', checked)} label="Trend Konu" description="Yeni bir trend konu bulunduğunda bildirim alın" icon={<TrendingUp className="w-5 h-5 text-warning" />} />
        </div>
      </section>
      <div className="flex justify-end">
        <button onClick={saveSettings} disabled={saving} className="btn btn-primary inline-flex items-center gap-2 px-6 py-2.5">
          {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Kaydediliyor...</span></>) : (<><Save className="w-4 h-4" /><span>Kaydet</span></>)}
        </button>
      </div>
    </div>
  );
}

// Security Tab Component
function SecurityTab() {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-text mb-1">Güvenlik Ayarları</h3>
      <p className="text-sm text-text-muted">Güvenlik ayarları yakında eklenecek</p>
    </div>
  );
}

// Main Settings Page
export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return <GeneralTab />;
      case 'apikeys': return <ApiKeysTab />;
      case 'notifications': return <NotificationsTab />;
      case 'security': return <SecurityTab />;
      default: return <GeneralTab />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Ayarlar</h1>
        <p className="text-text-muted mt-1">Platform ayarlarını yönetin</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-64 flex-shrink-0" aria-label="Settings navigation">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${activeTab === tab.id ? 'bg-primary-400/10 text-primary-400 border border-primary-400/20' : 'text-text-muted hover:text-text hover:bg-surface-alt'}`} 
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 min-w-0">{renderTabContent()}</main>
      </div>
    </div>
  );
}
