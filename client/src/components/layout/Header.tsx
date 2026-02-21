import { useAuthStore } from '../../store/authStore';
import { User } from 'lucide-react';

export default function Header() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-16 bg-dark-900/80 backdrop-blur-md border-b border-dark-700 flex items-center justify-between px-6 sticky top-0 z-40">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800">
          <User className="w-4 h-4 text-dark-400" />
          <span className="text-sm text-dark-200">{user?.name || user?.email || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}
