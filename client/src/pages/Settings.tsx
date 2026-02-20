import { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Save,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import type { NotificationSettings } from '../types';

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

// Notification Settings Tab
function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: false,
    pushEnabled: false,
    notifyOnPublishSuccess: false,
    notifyOnPublishFailed: false,
    notifyOnTrendingTopic: false,
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
        emailEnabled: data.emailEnabled ?? false,
        pushEnabled: data.pushEnabled ?? false,
        notifyOnPublishSuccess: data.notifyOnPublishSuccess ?? false,
        notifyOnPublishFailed: data.notifyOnPublishFailed ?? false,
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

      // Save each setting individually
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

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-text">Bildirim Ayarları</h2>
        <p className="text-text-muted mt-1">
          E-posta ve push bildirim tercihlerinizi yönetin
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          role="alert"
          className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-center gap-3"
        >
          <XCircle className="w-5 h-5 text-error flex-shrink-0" />
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {saveStatus === 'success' && (
        <div 
          role="alert"
          className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <p className="text-success text-sm">Ayarlar başarıyla kaydedildi</p>
        </div>
      )}

      {/* Channel Settings */}
      <section className="card">
        <h3 className="text-lg font-medium text-text mb-4">Bildirim Kanalları</h3>
        <div className="divide-y divide-border">
          <ToggleSwitch
            id="emailEnabled"
            checked={settings.emailEnabled}
            onChange={(checked) => updateSetting('emailEnabled', checked)}
            label="E-posta Bildirimleri"
            description="Önemli olaylar hakkında e-posta alın"
            icon={<Mail className="w-5 h-5 text-primary-400" />}
          />
          <ToggleSwitch
            id="pushEnabled"
            checked={settings.pushEnabled}
            onChange={(checked) => updateSetting('pushEnabled', checked)}
            label="Push Bildirimleri"
            description="Tarayıcı push bildirimlerini etkinleştirin"
            icon={<Smartphone className="w-5 h-5 text-accent-400" />}
          />
        </div>
      </section>

      {/* Notification Types */}
      <section className="card">
        <h3 className="text-lg font-medium text-text mb-4">Bildirim Türleri</h3>
        <div className="divide-y divide-border">
          <ToggleSwitch
            id="notifyOnPublishSuccess"
            checked={settings.notifyOnPublishSuccess}
            onChange={(checked) => updateSetting('notifyOnPublishSuccess', checked)}
            label="Yayın Başarılı"
            description="Makale başarıyla yayınlandığında bildirim alın"
            icon={<CheckCircle className="w-5 h-5 text-success" />}
          />
          <ToggleSwitch
            id="notifyOnPublishFailed"
            checked={settings.notifyOnPublishFailed}
            onChange={(checked) => updateSetting('notifyOnPublishFailed', checked)}
            label="Yayın Başarısız"
            description="Yayınlama başarısız olduğunda bildirim alın"
            icon={<XCircle className="w-5 h-5 text-error" />}
          />
          <ToggleSwitch
            id="notifyOnTrendingTopic"
            checked={settings.notifyOnTrendingTopic}
            onChange={(checked) => updateSetting('notifyOnTrendingTopic', checked)}
            label="Trend Konu"
            description="Yeni bir trend konu bulunduğunda bildirim alın"
            icon={<TrendingUp className="w-5 h-5 text-warning" />}
          />
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn btn-primary inline-flex items-center gap-2 px-6 py-2.5"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Kaydet</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Main Settings Page
export default function Settings() {
  const [activeTab, setActiveTab] = useState<'notifications'>('notifications');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Ayarlar</h1>
        <p className="text-text-muted mt-1">Platform ayarlarını yönetin</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`
              group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
              transition-colors duration-200 cursor-pointer
              ${activeTab === 'notifications'
                ? 'border-primary-400 text-primary-400'
                : 'border-transparent text-text-muted hover:text-text hover:border-border'
              }
            `}
            aria-current={activeTab === 'notifications' ? 'page' : undefined}
          >
            <Bell className="w-4 h-4" />
            Bildirimler
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'notifications' && <NotificationsTab />}
      </div>
    </div>
  );
}
