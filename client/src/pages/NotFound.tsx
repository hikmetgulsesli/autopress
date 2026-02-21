import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-surface-alt border border-border flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-text-muted" />
        </div>
        
        <h1 className="text-6xl font-bold text-text mb-2 font-variant-numeric tabular-nums">
          404
        </h1>
        
        <h2 className="text-xl font-semibold text-text mb-3">
          Sayfa Bulunamadi
        </h2>
        
        <p className="text-text-muted mb-8">
          Aradiginiz sayfa mevcut degil veya kaldirilmis olabilir.
          Lutfen URL&apos;yi kontrol edin veya ana sayfaya donun.
        </p>
        
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface bg-primary-400 text-surface hover:bg-primary-500"
        >
          <Home className="w-5 h-5" />
          Ana Sayfaya Don
        </button>
      </div>
    </div>
  );
}
