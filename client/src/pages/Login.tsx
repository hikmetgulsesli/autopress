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
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-primary-600)' }}
          >
            <Newspaper className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>AutoPress</h1>
          <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>AI Yayıncılık Platformu</p>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="rounded-xl p-6 space-y-4"
          style={{ 
            backgroundColor: 'var(--color-surface-alt)', 
            border: '1px solid var(--color-border)' 
          }}
        >
          {error && (
            <div 
              className="px-4 py-2 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'rgba(248, 113, 113, 0.1)', 
                border: '1px solid rgba(248, 113, 113, 0.3)', 
                color: 'var(--color-error)' 
              }}
            >{error}</div>
          )}
          <div>
            <label 
              className="block text-sm mb-1.5" 
              style={{ color: 'var(--color-text-muted)' }}
            >E-posta</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg focus:outline-none transition-colors"
              style={{ 
                backgroundColor: 'var(--color-surface)', 
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)'
              }}
              placeholder="admin@autopress.local" required
            />
          </div>
          <div>
            <label 
              className="block text-sm mb-1.5" 
              style={{ color: 'var(--color-text-muted)' }}
            >Şifre</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg focus:outline-none transition-colors"
              style={{ 
                backgroundColor: 'var(--color-surface)', 
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)'
              }}
              placeholder="••••••••" required
            />
          </div>
          <button
            type="submit" disabled={isLoading}
            className="w-full py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            style={{ 
              backgroundColor: 'var(--color-primary-600)', 
              color: 'white' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-700)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
            }}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}
