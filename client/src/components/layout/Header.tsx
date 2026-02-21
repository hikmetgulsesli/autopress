import { useAuthStore } from '../../store/authStore';
import { User, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-16 bg-dark-900/80 backdrop-blur-md border-b border-dark-700 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors cursor-pointer lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800">
          <User className="w-4 h-4 text-dark-400" />
          <span className="text-sm text-dark-200">{user?.name || user?.email || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}
