import { useState } from 'react';
import { Settings as SettingsIcon, User, Globe, Bell, Shield } from 'lucide-react';
import ProfileSettings from '../components/settings/ProfileSettings';

const tabs = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'general', label: 'Genel', icon: Globe },
  { id: 'notifications', label: 'Bildirimler', icon: Bell },
  { id: 'security', label: 'Güvenlik', icon: Shield },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'general':
        return (
          <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-12 text-center">
            <div className="w-16 h-16 bg-dark-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-dark-400" />
            </div>
            <h3 className="text-lg font-medium text-dark-300">Genel Ayarlar</h3>
            <p className="text-dark-500 mt-1">Yakında</p>
          </div>
        );
      case 'notifications':
        return (
          <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-12 text-center">
            <div className="w-16 h-16 bg-dark-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-dark-400" />
            </div>
            <h3 className="text-lg font-medium text-dark-300">Bildirim Ayarları</h3>
            <p className="text-dark-500 mt-1">Yakında</p>
          </div>
        );
      case 'security':
        return (
          <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-12 text-center">
            <div className="w-16 h-16 bg-dark-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-dark-400" />
            </div>
            <h3 className="text-lg font-medium text-dark-300">Güvenlik Ayarları</h3>
            <p className="text-dark-500 mt-1">Yakında</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
        <p className="text-dark-400 mt-1">Platform ayarlarını yönetin</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-700">
        <nav className="flex gap-1" aria-label="Settings tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-600'
                }`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  );
}
