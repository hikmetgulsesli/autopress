import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import api from '../services/api';
import type { ApiKeys, ApiKeyField } from '../types';

type Tab = 'general' | 'api-keys';

const API_KEY_FIELDS: ApiKeyField[] = [
  {
    key: 'openai_api_key',
    label: 'OpenAI API Key',
    placeholder: 'sk-...',
    description: 'OpenAI API anahtarı, içerik üretimi için kullanılır',
  },
  {
    key: 'unsplash_api_key',
    label: 'Unsplash API Key',
    placeholder: 'Enter Unsplash API key',
    description: 'Unsplash API anahtarı, görseller için kullanılır',
  },
  {
    key: 'google_trends_api_key',
    label: 'Google Trends API Key',
    placeholder: 'Enter Google Trends API key',
    description: 'Google Trends API anahtarı, trend analizi için kullanılır',
  },
  {
    key: 'search_console_client_id',
    label: 'Search Console Client ID',
    placeholder: 'Enter Client ID',
    description: 'Google Search Console OAuth Client ID',
  },
  {
    key: 'search_console_client_secret',
    label: 'Search Console Client Secret',
    placeholder: 'Enter Client Secret',
    description: 'Google Search Console OAuth Client Secret',
  },
  {
    key: 'search_console_refresh_token',
    label: 'Search Console Refresh Token',
    placeholder: 'Enter Refresh Token',
    description: 'Google Search Console OAuth Refresh Token',
  },
];

// Secure input component with show/hide toggle
interface SecureInputProps {
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function SecureInput({ id, value, placeholder, onChange, disabled }: SecureInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-colors pr-12"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-alt transition-colors cursor-pointer"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label={show ? 'Hide API key' : 'Show API key'}
        aria-pressed={show}
      >
        {show ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

// API Keys Tab Component
interface ApiKeysTabProps {
  apiKeys: ApiKeys;
  onSave: (key: keyof ApiKeys, value: string) => Promise<void>;
  saving: Record<string, boolean>;
  saved: Record<string, boolean>;
}

function ApiKeysTab({ apiKeys, onSave, saving, saved }: ApiKeysTabProps) {
  const [values, setValues] = useState<ApiKeys>(apiKeys);

  useEffect(() => {
    setValues(apiKeys);
  }, [apiKeys]);

  const handleChange = (key: keyof ApiKeys, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: keyof ApiKeys) => {
    const value = values[key] || '';
    await onSave(key, value);
  };

  const hasChanges = (key: keyof ApiKeys) => {
    return values[key] !== apiKeys[key];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary-400)', opacity: 0.1 }}
        >
          <Key className="w-5 h-5" style={{ color: 'var(--color-primary-400)' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            API Anahtarları
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Harici servisler için API anahtarlarını yapılandırın
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {API_KEY_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor={field.key}
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                {field.label}
              </label>
              {saved[field.key] && (
                <span className="text-xs" style={{ color: 'var(--color-success)' }}>
                  Kaydedildi
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {field.description}
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <SecureInput
                  id={field.key}
                  value={values[field.key] || ''}
                  placeholder={field.placeholder}
                  onChange={(value) => handleChange(field.key, value)}
                  disabled={saving[field.key]}
                />
              </div>
              <button
                type="button"
                onClick={() => handleSave(field.key)}
                disabled={saving[field.key] || !hasChanges(field.key)}
                className="px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  backgroundColor: hasChanges(field.key)
                    ? 'var(--color-primary-400)'
                    : 'var(--color-surface-alt)',
                  color: hasChanges(field.key)
                    ? 'var(--color-surface)'
                    : 'var(--color-text-muted)',
                }}
              >
                {saving[field.key] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Kaydet
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-8 p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--color-surface-alt)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
          Güvenlik Notu
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          API anahtarları sunucuda güvenli bir şekilde saklanır. Anahtarlarınızı asla başkalarıyla
          paylaşmayın ve düzenli olarak rotasyon yapın.
        </p>
      </div>
    </div>
  );
}

// General Tab Component
function GeneralTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary-400)', opacity: 0.1 }}
        >
          <SettingsIcon className="w-5 h-5" style={{ color: 'var(--color-primary-400)' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            Genel Ayarlar
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Platform genel ayarlarını yapılandırın
          </p>
        </div>
      </div>

      <div
        className="p-8 rounded-xl border text-center"
        style={{
          backgroundColor: 'var(--color-surface-alt)',
          borderColor: 'var(--color-border)',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>Genel ayarlar yakında eklenecek</p>
      </div>
    </div>
  );
}

// Main Settings Component
export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('api-keys');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/settings');
        const settings = response.data;

        // Extract API keys from settings
        const keys: ApiKeys = {
          openai_api_key: settings.openai_api_key || '',
          unsplash_api_key: settings.unsplash_api_key || '',
          google_trends_api_key: settings.google_trends_api_key || '',
          search_console_client_id: settings.search_console_client_id || '',
          search_console_client_secret: settings.search_console_client_secret || '',
          search_console_refresh_token: settings.search_console_refresh_token || '',
        };
        setApiKeys(keys);
      } catch (err) {
        setError('Ayarlar yüklenirken bir hata oluştu');
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Save individual API key
  const handleSaveApiKey = async (key: keyof ApiKeys, value: string) => {
    try {
      setSaving((prev) => ({ ...prev, [key]: true }));
      setError(null);

      await api.put(`/settings/${key}`, {
        value,
        type: 'string',
      });

      // Update local state
      setApiKeys((prev) => ({ ...prev, [key]: value }));

      // Show success indicator
      setSaved((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setSaved((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      setError(`${key} kaydedilirken bir hata oluştu`);
      console.error('Failed to save setting:', err);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'Genel' },
    { id: 'api-keys', label: 'API Anahtarları' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{
            color: 'var(--color-text)',
            fontFamily: 'var(--font-heading)',
          }}
        >
          Ayarlar
        </h1>
        <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Platform ayarlarını yönetin
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
        <nav className="flex gap-6" aria-label="Settings tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              className="py-3 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer"
              style={{
                color:
                  activeTab === tab.id ? 'var(--color-primary-400)' : 'var(--color-text-muted)',
                borderColor: activeTab === tab.id ? 'var(--color-primary-400)' : 'transparent',
              }}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: 'var(--color-surface-alt)',
          borderColor: 'var(--color-border)',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12" role="status" aria-label="Loading settings">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary-400)' }} />
          </div>
        ) : (
          <>
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'api-keys' && (
              <ApiKeysTab
                apiKeys={apiKeys}
                onSave={handleSaveApiKey}
                saving={saving}
                saved={saved}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
