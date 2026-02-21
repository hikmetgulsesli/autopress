import { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Settings as SettingsIcon, 
  Bell, 
  Shield,
  Key,
  Mail,
  Smartphone,
  CheckCircle,
  XCircle,
  TrendingUp,
  Save,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import type { UpdateProfileRequest, ChangePasswordRequest, NotificationSettings } from '../types';

type TabId = 'profile' | 'general' | 'api-keys' | 'notifications' | 'security';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'profile', label: 'Profil', icon: <User className="w-4 h-4" /> },
  { id: 'general', label: 'Genel', icon: <SettingsIcon className="w-4 h-4" /> },
  { id: 'api-keys', label: 'API Anahtarları', icon: <Key className="w-4 h-4" /> },
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

// Profile Tab Component
function ProfileTab() {
  const { user, checkAuth } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await api.patch('/auth/profile', { name } as UpdateProfileRequest);
      setMessage({ type: 'success', text: response.data.message || 'Profil güncellendi' });
      await checkAuth();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Profil güncellenirken bir hata oluştu' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Yeni şifre en az 8 karakter olmalıdır' });
      return;
    }
    setIsPasswordLoading(true);
    try {
      const response = await api.post('/auth/change-password', { currentPassword, newPassword } as ChangePasswordRequest);
      setPasswordMessage({ type: 'success', text: response.data.message || 'Şifre değiştirildi' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.response?.data?.error || 'Şifre değiştirilirken bir hata oluştu' });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="card">
        <h3 className="text-lg font-semibold text-text mb-1">Profil Bilgileri</h3>
        <p className="text-sm text-text-muted mb-6">Kişisel bilgilerinizi güncelleyin</p>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-text mb-2">İsim</label>
              <input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Adınız" maxLength={100} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="profile-email" className="block text-sm font-medium text-text mb-2">E-posta</label>
              <input id="profile-email" type="email" value={user?.email || ''} disabled className="input bg-surface-alt/50 cursor-not-allowed opacity-60" autoComplete="email" />
              <p className="text-xs text-text-muted mt-1">E-posta adresi değiştirilemez</p>
            </div>
          </div>
          {message && <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`} role="alert">{message.text}</div>}
          <div className="flex justify-end">
            <button type="submit" disabled={isLoading || name === user?.name} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Kaydediliyor...' : 'Profili Kaydet'}</button>
          </div>
        </form>
      </section>
      <section className="card">
        <h3 className="text-lg font-semibold text-text mb-1">Şifre Değiştir</h3>
        <p className="text-sm text-text-muted mb-6">Hesap güvenliğiniz için şifrenizi düzenli olarak değiştirin</p>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-text mb-2">Mevcut Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input pl-10" placeholder="••••••••" autoComplete="current-password" />
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-text mb-2">Yeni Şifre</label>
                <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="••••••••" autoComplete="new-password" />
                <p className="text-xs text-text-muted mt-1">En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam</p>
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-text mb-2">Yeni Şifre (Tekrar)</label>
                <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" placeholder="••••••••" autoComplete="new-password" />
              </div>
            </div>
          </div>
          {passwordMessage && <div className={`p-3 rounded-lg text-sm ${passwordMessage.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`} role="alert">{passwordMessage.text}</div>}
          <div className="flex justify-end">
            <button type="submit" disabled={isPasswordLoading || !currentPassword || !newPassword || !confirmPassword} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">{isPasswordLoading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

// General Tab Component
function GeneralTab() {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-text mb-1">Genel Ayarlar</h3>
      <p className="text-sm text-text-muted">Genel ayarlar yakında eklenecek</p>
    </div>
  );
}

// API Key Input Component with show/hide toggle
interface ApiKeyInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function ApiKeyInput({ id, label, value, onChange, placeholder }: ApiKeyInputProps) {
  const [showValue, setShowValue] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text mb-2">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={showValue ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input pr-10"
          placeholder={placeholder || '••••••••'}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShowValue(!showValue)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded cursor-pointer"
          aria-label={showValue ? 'Hide' : 'Show'}
        >
          {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// API Keys Tab Component
interface ApiKeySettings {
  openai_api_key: string;
  unsplash_api_key: string;
  google_trends_api_key: string;
  search_console_client_id: string;
  search_console_client_secret: string;
  search_console_refresh_token: string;
}

function ApiKeysTab() {
  const [settings, setSettings] = useState<ApiKeySettings>({
    openai_api_key: '',
    unsplash_api_key: '',
    google_trends_api_key: '',
    search_console_client_id: '',
    search_console_client_secret: '',
    search_console_refresh_token: '',
  });
  const [originalSettings, setOriginalSettings] = useState<ApiKeySettings>({
    openai_api_key: '',
    unsplash_api_key: '',
    google_trends_api_key: '',
    search_console_client_id: '',
    search_console_client_secret: '',
    search_console_refresh_token: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savedIndicators, setSavedIndicators] = useState<Record<string, boolean>>({});
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
      const newSettings: ApiKeySettings = {
        openai_api_key: data.openai_api_key || '',
        unsplash_api_key: data.unsplash_api_key || '',
        google_trends_api_key: data.google_trends_api_key || '',
        search_console_client_id: data.search_console_client_id || '',
        search_console_client_secret: data.search_console_client_secret || '',
        search_console_refresh_token: data.search_console_refresh_token || '',
      };
      setSettings(newSettings);
      setOriginalSettings(newSettings);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ayarlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof ApiKeySettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveKey = async (key: keyof ApiKeySettings) => {
    try {
      setSaving((prev) => ({ ...prev, [key]: true }));
      setError(null);
      await api.put(`/settings/${key}`, { value: settings[key], type: 'string' });
      setOriginalSettings((prev) => ({ ...prev, [key]: settings[key] }));
      setSavedIndicators((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setSavedIndicators((prev) => ({ ...prev, [key]: false }));
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || `${key} kaydedilirken bir hata oluştu`);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const hasChanges = (key: keyof ApiKeySettings) => settings[key] !== originalSettings[key];

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
        <p className="text-text-muted mt-1">Harici servisler için API anahtarlarınızı yönetin</p>
      </div>

      {error && (
        <div role="alert" className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-error flex-shrink-0" />
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Security Note */}
      <div className="bg-info/10 border border-info/20 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-info">Güvenlik Notu</h4>
          <p className="text-sm text-info/80 mt-1">
            API anahtarları sunucuda güvenli bir şekilde saklanır. Anahtarlarınızı kimseyle paylaşmayın.
          </p>
        </div>
      </div>

      {/* OpenAI API Key */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-text">OpenAI API Key</h3>
            <p className="text-sm text-text-muted">Yapay zeka içerik üretimi için kullanılır</p>
          </div>
          <div className="flex items-center gap-2">
            {savedIndicators.openai_api_key && (
              <span className="text-sm text-success flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Kaydedildi
              </span>
            )}
            <button
              onClick={() => saveKey('openai_api_key')}
              disabled={saving.openai_api_key || !hasChanges('openai_api_key')}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {saving.openai_api_key ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Kaydediliyor...</span></>
              ) : (
                <><Save className="w-4 h-4" /><span>Kaydet</span></>
              )}
            </button>
          </div>
        </div>
        <ApiKeyInput
          id="openai_api_key"
          label="OpenAI API Key"
          value={settings.openai_api_key}
          onChange={(value) => updateSetting('openai_api_key', value)}
          placeholder="sk-..."
        />
      </section>

      {/* Unsplash API Key */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-text">Unsplash API Key</h3>
            <p className="text-sm text-text-muted">Ücretsiz stok fotoğraflar için kullanılır</p>
          </div>
          <div className="flex items-center gap-2">
            {savedIndicators.unsplash_api_key && (
              <span className="text-sm text-success flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Kaydedildi
              </span>
            )}
            <button
              onClick={() => saveKey('unsplash_api_key')}
              disabled={saving.unsplash_api_key || !hasChanges('unsplash_api_key')}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {saving.unsplash_api_key ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Kaydediliyor...</span></>
              ) : (
                <><Save className="w-4 h-4" /><span>Kaydet</span></>
              )}
            </button>
          </div>
        </div>
        <ApiKeyInput
          id="unsplash_api_key"
          label="Unsplash API Key"
          value={settings.unsplash_api_key}
          onChange={(value) => updateSetting('unsplash_api_key', value)}
          placeholder="..."
        />
      </section>

      {/* Google Trends API Key */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-text">Google Trends API Key</h3>
            <p className="text-sm text-text-muted">Trend analizi için kullanılır</p>
          </div>
          <div className="flex items-center gap-2">
            {savedIndicators.google_trends_api_key && (
              <span className="text-sm text-success flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Kaydedildi
              </span>
            )}
            <button
              onClick={() => saveKey('google_trends_api_key')}
              disabled={saving.google_trends_api_key || !hasChanges('google_trends_api_key')}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {saving.google_trends_api_key ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Kaydediliyor...</span></>
              ) : (
                <><Save className="w-4 h-4" /><span>Kaydet</span></>
              )}
            </button>
          </div>
        </div>
        <ApiKeyInput
          id="google_trends_api_key"
          label="Google Trends API Key"
          value={settings.google_trends_api_key}
          onChange={(value) => updateSetting('google_trends_api_key', value)}
          placeholder="..."
        />
      </section>

      {/* Search Console Credentials */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-text">Search Console Credentials</h3>
            <p className="text-sm text-text-muted">Google Search Console entegrasyonu için kullanılır</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <ApiKeyInput
              id="search_console_client_id"
              label="Search Console Client ID"
              value={settings.search_console_client_id}
              onChange={(value) => updateSetting('search_console_client_id', value)}
              placeholder="..."
            />
            <div className="flex items-center gap-2 ml-4 mt-6">
              {savedIndicators.search_console_client_id && (
                <span className="text-sm text-success flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Kaydedildi
                </span>
              )}
              <button
                onClick={() => saveKey('search_console_client_id')}
                disabled={saving.search_console_client_id || !hasChanges('search_console_client_id')}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {saving.search_console_client_id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /></>
                ) : (
                  <><Save className="w-4 h-4" /><span>Kaydet</span></>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <ApiKeyInput
              id="search_console_client_secret"
              label="Search Console Client Secret"
              value={settings.search_console_client_secret}
              onChange={(value) => updateSetting('search_console_client_secret', value)}
              placeholder="..."
            />
            <div className="flex items-center gap-2 ml-4 mt-6">
              {savedIndicators.search_console_client_secret && (
                <span className="text-sm text-success flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Kaydedildi
                </span>
              )}
              <button
                onClick={() => saveKey('search_console_client_secret')}
                disabled={saving.search_console_client_secret || !hasChanges('search_console_client_secret')}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {saving.search_console_client_secret ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /></>
                ) : (
                  <><Save className="w-4 h-4" /><span>Kaydet</span></>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <ApiKeyInput
              id="search_console_refresh_token"
              label="Search Console Refresh Token"
              value={settings.search_console_refresh_token}
              onChange={(value) => updateSetting('search_console_refresh_token', value)}
              placeholder="..."
            />
            <div className="flex items-center gap-2 ml-4 mt-6">
              {savedIndicators.search_console_refresh_token && (
                <span className="text-sm text-success flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Kaydedildi
                </span>
              )}
              <button
                onClick={() => saveKey('search_console_refresh_token')}
                disabled={saving.search_console_refresh_token || !hasChanges('search_console_refresh_token')}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {saving.search_console_refresh_token ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /></>
                ) : (
                  <><Save className="w-4 h-4" /><span>Kaydet</span></>
                )}
              </button>
            </div>
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
  const [activeTab, setActiveTab] = useState<TabId>('api-keys');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab />;
      case 'general': return <GeneralTab />;
      case 'api-keys': return <ApiKeysTab />;
      case 'notifications': return <NotificationsTab />;
      case 'security': return <SecurityTab />;
      default: return <ApiKeysTab />;
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
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${activeTab === tab.id ? 'bg-primary-400/10 text-primary-400 border border-primary-400/20' : 'text-text-muted hover:text-text hover:bg-surface-alt'}`} 
                  aria-current={activeTab === tab.id ? 'page' : undefined}
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
