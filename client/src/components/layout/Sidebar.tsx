import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Globe, PenTool, Send, TrendingUp,
  Search, Settings, LogOut, Newspaper, Shield, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sites', icon: Globe, label: 'Site Yönetimi' },
  { to: '/content', icon: PenTool, label: 'İçerik Stüdyosu' },
  { to: '/publisher', icon: Send, label: 'Yayıncı' },
  { to: '/trends', icon: TrendingUp, label: 'Trend Explorer' },
  { to: '/seo', icon: Search, label: 'SEO Araçları' },
  { to: '/security', icon: Shield, label: 'Güvenlik' },
  { to: '/settings', icon: Settings, label: 'Ayarlar' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside 
        className={clsx(
          'fixed left-0 top-0 h-screen w-64 bg-dark-900 border-r border-dark-700 flex flex-col z-50',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        <div className="p-5 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AutoPress</h1>
              <p className="text-xs text-dark-400">AI Yayıncılık</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors cursor-pointer lg:hidden text-dark-400 hover:text-white hover:bg-dark-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-dark-300 hover:text-white hover:bg-dark-800'
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-dark-700">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-dark-400 hover:text-red-400 hover:bg-dark-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Çıkış Yap
          </button>
        </div>
      </aside>
    </>
  );
}
