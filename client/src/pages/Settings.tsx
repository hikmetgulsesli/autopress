import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Globe, Cpu, Clock, FileText, Eye, EyeOff, Save, Loader2, Check } from 'lucide-react';
import api from '../services/api';
import type { ApiKeys, ApiKeyField, GeneralSettings, LanguageOption, AIModelOption } from '../types';

type Tab = 'general' | 'api-keys';

// Available languages
const LANGUAGES: LanguageOption[] = [
  { code: 'tr', name: 'Türkçe' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'zh', name: '中文' },
];

// Available AI models
const AI_MODELS: AIModelOption[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
];

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

// Select input component
interface SelectInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

function SelectInput({ id, value, onChange, options, disabled }: SelectInputProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-colors cursor-pointer"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Number input with controls
interface NumberInputProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

function NumberInput({ id, value, onChange, min = 0, max, step = 1, disabled }: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max || newValue, newValue)));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      />
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
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                  <Check className="w-3 h-3" />
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
interface GeneralTabProps {
  settings: GeneralSettings;
  onSave: (key: keyof GeneralSettings, value: string | number) => Promise<void>;
  saving: Record<string, boolean>;
  saved: Record<string, boolean>;
}

function GeneralTab({ settings, onSave, saving, saved }: GeneralTabProps) {
  const [values, setValues] = useState<GeneralSettings>(settings);

  useEffect(() => {
    setValues(settings);
  }, [settings]);

  const handleChange = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: keyof GeneralSettings) => {
    await onSave(key, values[key] as string | number);
  };

  const hasChanges = (key: keyof GeneralSettings) => {
    return values[key] !== settings[key];
  };

  const isSaving = (key: keyof GeneralSettings) => saving[`general_${key}`];
  const isSaved = (key: keyof GeneralSettings) => saved[`general_${key}`];

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

      <div className="space-y-8">
        {/* Language Setting */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <label
                htmlFor="language"
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Varsayılan Dil
              </label>
            </div>
            {isSaved('language') && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                <Check className="w-3 h-3" />
                Kaydedildi
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Oluşturulan içeriklerin varsayılan dili
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <SelectInput
                id="language"
                value={values.language}
                onChange={(value) => handleChange('language', value)}
                options={LANGUAGES.map((lang) => ({ value: lang.code, label: lang.name }))}
                disabled={isSaving('language')}
              />
            </div>
            <button
              type="button"
              onClick={() => handleSave('language')}
              disabled={isSaving('language') || !hasChanges('language')}
              className="px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: hasChanges('language')
                  ? 'var(--color-primary-400)'
                  : 'var(--color-surface-alt)',
                color: hasChanges('language')
                  ? 'var(--color-surface)'
                  : 'var(--color-text-muted)',
              }}
            >
              {isSaving('language') ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Kaydet
            </button>
          </div>
        </div>

        {/* AI Model Setting */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <label
                htmlFor="ai_model"
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                AI Model
              </label>
            </div>
            {isSaved('ai_model') && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                <Check className="w-3 h-3" />
                Kaydedildi
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            İçerik üretimi için kullanılacak AI modeli
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <SelectInput
                id="ai_model"
                value={values.ai_model}
                onChange={(value) => handleChange('ai_model', value)}
                options={AI_MODELS.map((model) => ({ value: model.id, label: `${model.name} (${model.provider})` }))}
                disabled={isSaving('ai_model')}
              />
            </div>
            <button
              type="button"
              onClick={() => handleSave('ai_model')}
              disabled={isSaving('ai_model') || !hasChanges('ai_model')}
              className="px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: hasChanges('ai_model')
                  ? 'var(--color-primary-400)'
                  : 'var(--color-surface-alt)',
                color: hasChanges('ai_model')
                  ? 'var(--color-surface)'
                  : 'var(--color-text-muted)',
              }}
            >
              {isSaving('ai_model') ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Kaydet
            </button>
          </div>
        </div>

        {/* Publish Jitter Setting */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <label
                htmlFor="publish_jitter_minutes"
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Yayın Jitter Süresi (dakika)
              </label>
            </div>
            {isSaved('publish_jitter_minutes') && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                <Check className="w-3 h-3" />
                Kaydedildi
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Planlı yayın zamanına eklenecek rastgele gecikme aralığı (dakika cinsinden)
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <NumberInput
                id="publish_jitter_minutes"
                value={values.publish_jitter_minutes}
                onChange={(value) => handleChange('publish_jitter_minutes', value)}
                min={0}
                max={60}
                disabled={isSaving('publish_jitter_minutes')}
              />
            </div>
            <button
              type="button"
              onClick={() => handleSave('publish_jitter_minutes')}
              disabled={isSaving('publish_jitter_minutes') || !hasChanges('publish_jitter_minutes')}
              className="px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: hasChanges('publish_jitter_minutes')
                  ? 'var(--color-primary-400)'
                  : 'var(--color-surface-alt)',
                color: hasChanges('publish_jitter_minutes')
                  ? 'var(--color-surface)'
                  : 'var(--color-text-muted)',
              }}
            >
              {isSaving('publish_jitter_minutes') ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Kaydet
            </button>
          </div>
        </div>

        {/* SEO Min Words Setting */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <label
                htmlFor="seo_min_words"
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                SEO Minimum Kelime Sayısı
              </label>
            </div>
            {isSaved('seo_min_words') && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                <Check className="w-3 h-3" />
                Kaydedildi
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            İçeriklerin SEO için sahip olması gereken minimum kelime sayısı
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <NumberInput
                id="seo_min_words"
                value={values.seo_min_words}
                onChange={(value) => handleChange('seo_min_words', value)}
                min={100}
                max={5000}
                step={50}
                disabled={isSaving('seo_min_words')}
              />
            </div>
            <button
              type="button"
              onClick={() => handleSave('seo_min_words')}
              disabled={isSaving('seo_min_words') || !hasChanges('seo_min_words')}
              className="px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: hasChanges('seo_min_words')
                  ? 'var(--color-primary-400)'
                  : 'var(--color-surface-alt)',
                color: hasChanges('seo_min_words')
                  ? 'var(--color-surface)'
                  : 'var(--color-text-muted)',
              }}
            >
              {isSaving('seo_min_words') ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Settings Component
export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    language: 'tr',
    ai_model: 'gpt-4o',
    publish_jitter_minutes: 15,
    seo_min_words: 300,
  });
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

        // Extract general settings from settings
        setGeneralSettings({
          language: settings.language || 'tr',
          ai_model: settings.ai_model || 'gpt-4o',
          publish_jitter_minutes: settings.publish_jitter_minutes || 15,
          seo_min_words: settings.seo_min_words || 300,
        });
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

  // Save general setting
  const handleSaveGeneralSetting = async (key: keyof GeneralSettings, value: string | number) => {
    const saveKey = `general_${key}`;
    try {
      setSaving((prev) => ({ ...prev, [saveKey]: true }));
      setError(null);

      // Determine type based on key
      const settingType = key === 'publish_jitter_minutes' || key === 'seo_min_words' ? 'number' : 'string';

      await api.put(`/settings/${key}`, {
        value,
        type: settingType,
      });

      // Update local state
      setGeneralSettings((prev) => ({ ...prev, [key]: value }));

      // Show success indicator
      setSaved((prev) => ({ ...prev, [saveKey]: true }));
      setTimeout(() => {
        setSaved((prev) => ({ ...prev, [saveKey]: false }));
      }, 2000);
    } catch (err) {
      setError(`${key} kaydedilirken bir hata oluştu`);
      console.error('Failed to save setting:', err);
    } finally {
      setSaving((prev) => ({ ...prev, [saveKey]: false }));
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
            {activeTab === 'general' && (
              <GeneralTab
                settings={generalSettings}
                onSave={handleSaveGeneralSetting}
                saving={saving}
                saved={saved}
              />
            )}
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
