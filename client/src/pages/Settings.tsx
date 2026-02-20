import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Globe, Bot, Clock, FileText } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import clsx from 'clsx';

type Tab = 'general' | 'ai' | 'publishing' | 'notifications';

const AI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

const LANGUAGES = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { settings, isLoading, error, fetchSettings, updateSetting, saveSettings } = useSettingsStore();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    const success = await saveSettings();
    if (success) {
      setSaveMessage('Ayarlar kaydedildi');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'Genel' },
    { id: 'ai', label: 'AI' },
    { id: 'publishing', label: 'Yayınlama' },
    { id: 'notifications', label: 'Bildirimler' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
        <p className="text-dark-400 mt-1">Platform ayarlarını yönetin</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-700">
        <nav className="flex gap-1" aria-label="Settings tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                activeTab === tab.id
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-dark-400 hover:text-white'
              )}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-error text-center py-8">{error}</div>
        ) : (
          <>
            {activeTab === 'general' && (
              <GeneralTab
                settings={settings}
                onChange={updateSetting}
              />
            )}
            {activeTab === 'ai' && (
              <ComingSoonTab icon={Bot} title="AI Ayarları" />
            )}
            {activeTab === 'publishing' && (
              <ComingSoonTab icon={Clock} title="Yayınlama Ayarları" />
            )}
            {activeTab === 'notifications' && (
              <ComingSoonTab icon={SettingsIcon} title="Bildirim Ayarları" />
            )}
          </>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Kaydet
        </button>
        {saveMessage && (
          <span className="text-accent-400 text-sm">{saveMessage}</span>
        )}
      </div>
    </div>
  );
}

interface GeneralTabProps {
  settings: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
}

function GeneralTab({ settings, onChange }: GeneralTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white mb-4">Genel Ayarlar</h2>
      
      {/* Default Language */}
      <div className="space-y-2">
        <label htmlFor="default_language" className="flex items-center gap-2 text-sm font-medium text-dark-300">
          <Globe className="w-4 h-4" />
          Varsayılan Dil
        </label>
        <select
          id="default_language"
          value={String(settings.default_language ?? 'tr')}
          onChange={(e) => onChange('default_language', e.target.value)}
          className="w-full px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent cursor-pointer"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-dark-500">Yeni içerikler için varsayılan dil</p>
      </div>

      {/* AI Model */}
      <div className="space-y-2">
        <label htmlFor="default_ai_model" className="flex items-center gap-2 text-sm font-medium text-dark-300">
          <Bot className="w-4 h-4" />
          Varsayılan AI Modeli
        </label>
        <select
          id="default_ai_model"
          value={String(settings.default_ai_model ?? 'gpt-4o')}
          onChange={(e) => onChange('default_ai_model', e.target.value)}
          className="w-full px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent cursor-pointer"
        >
          {AI_MODELS.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-dark-500">İçerik üretimi için kullanılacak AI modeli</p>
      </div>

      {/* Publish Jitter */}
      <div className="space-y-2">
        <label htmlFor="publish_jitter_minutes" className="flex items-center gap-2 text-sm font-medium text-dark-300">
          <Clock className="w-4 h-4" />
          Yayınlama Jitter Süresi (dakika)
        </label>
        <input
          id="publish_jitter_minutes"
          type="number"
          min={0}
          max={120}
          value={Number(settings.publish_jitter_minutes ?? 15)}
          onChange={(e) => onChange('publish_jitter_minutes', parseInt(e.target.value, 10) || 0)}
          className="w-full px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
        />
        <p className="text-xs text-dark-500">Planlanan yayın zamanına eklenecek rastgele gecikme (0-120 dakika)</p>
      </div>

      {/* SEO Min Word Count */}
      <div className="space-y-2">
        <label htmlFor="seo_min_word_count" className="flex items-center gap-2 text-sm font-medium text-dark-300">
          <FileText className="w-4 h-4" />
          SEO Minimum Kelime Sayısı
        </label>
        <input
          id="seo_min_word_count"
          type="number"
          min={100}
          max={5000}
          step={50}
          value={Number(settings.seo_min_word_count ?? 800)}
          onChange={(e) => onChange('seo_min_word_count', parseInt(e.target.value, 10) || 800)}
          className="w-full px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
        />
        <p className="text-xs text-dark-500">SEO uyumlu içerikler için minimum kelime sayısı (100-5000)</p>
      </div>
    </div>
  );
}

interface ComingSoonTabProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}

function ComingSoonTab({ icon: Icon, title }: ComingSoonTabProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-dark-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-dark-500" />
      </div>
      <h3 className="text-lg font-medium text-dark-300">{title}</h3>
      <p className="text-dark-500 mt-1">Yakında</p>
    </div>
  );
}
