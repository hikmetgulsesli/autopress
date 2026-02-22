import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Newspaper, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Giriş başarısız');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 bg-surface"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-primary-600"
          >
            <Newspaper className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text">AutoPress</h1>
          <p className="mt-1 text-text-muted">AI Yayıncılık Platformu</p>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="rounded-xl p-6 space-y-4 bg-surface-alt border border-border"
        >
          {error && (
            <div 
              className="px-4 py-2 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400"
            >{error}</div>
          )}
          <div>
            <label 
              className="block text-sm mb-1.5 text-text-muted"
            >E-posta</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg focus:outline-none transition-colors bg-surface border border-border text-text placeholder-text-subtle focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              placeholder="admin@autopress.local" required
            />
          </div>
          <div>
            <label 
              className="block text-sm mb-1.5 text-text-muted"
            >Şifre</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg focus:outline-none transition-colors bg-surface border border-border text-text placeholder-text-subtle focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              placeholder="••••••••" required
            />
          </div>
          <button
            type="submit" disabled={isLoading}
            className="w-full py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer bg-primary-600 hover:bg-primary-700 text-white"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}
