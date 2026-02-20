import { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Globe, Shield } from 'lucide-react';
import ProfileTab from '../components/settings/ProfileTab';

type TabId = 'profile' | 'notifications' | 'general' | 'security';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'profile',
    label: 'Profil',
    icon: User,
    description: 'Kişisel bilgilerinizi yönetin',
  },
  {
    id: 'notifications',
    label: 'Bildirimler',
    icon: Bell,
    description: 'Bildirim tercihlerinizi ayarlayın',
  },
  {
    id: 'general',
    label: 'Genel',
    icon: Globe,
    description: 'Genel platform ayarları',
  },
  {
    id: 'security',
    label: 'Güvenlik',
    icon: Shield,
    description: 'Güvenlik ve erişim ayarları',
  },
];

// Placeholder components for other tabs
function NotificationsTab() {
  return (
    <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Bildirim Ayarları</h3>
          <p className="text-sm text-dark-400">Bildirim tercihlerinizi yönetin</p>
        </div>
      </div>
      <p className="text-dark-400">Bildirim ayarları yakında eklenecek.</p>
    </div>
  );
}

function GeneralTab() {
  return (
    <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
          <Globe className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Genel Ayarlar</h3>
          <p className="text-sm text-dark-400">Platform genel ayarları</p>
        </div>
      </div>
      <p className="text-dark-400">Genel ayarlar yakında eklenecek.</p>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Güvenlik Ayarları</h3>
          <p className="text-sm text-dark-400">Güvenlik ve erişim kontrolleri</p>
        </div>
      </div>
      <p className="text-dark-400">Güvenlik ayarları yakında eklenecek.</p>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'general':
        return <GeneralTab />;
      case 'security':
        return <SecurityTab />;
      default:
        return <ProfileTab />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
        <p className="text-dark-400 mt-1">Platform ayarlarını yönetin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="bg-dark-800/50 rounded-xl border border-dark-700 p-4 space-y-1" aria-label="Ayarlar sekmeleri">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                      : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${isActive ? 'text-white' : ''}`}>
                      {tab.label}
                    </div>
                    <div className="text-xs text-dark-500 truncate">
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
