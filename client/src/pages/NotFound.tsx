import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ 
              backgroundColor: 'var(--color-surface-alt)',
              border: '2px solid var(--color-border)'
            }}
          >
            <AlertCircle 
              className="w-10 h-10"
              style={{ color: 'var(--color-error)' }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Error Code */}
        <h1 
          className="text-6xl font-bold mb-2"
          style={{ 
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text)',
            letterSpacing: 'var(--tracking-tight)'
          }}
        >
          404
        </h1>

        {/* Title */}
        <h2 
          className="text-2xl font-semibold mb-4"
          style={{ 
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text)'
          }}
        >
          Sayfa Bulunamadı
        </h2>

        {/* Description */}
        <p 
          className="mb-8"
          style={{ 
            color: 'var(--color-text-muted)',
            lineHeight: 'var(--leading-relaxed)'
          }}
        >
          Aradığınız sayfa mevcut değil veya taşınmış olabilir. 
          Lütfen URL'yi kontrol edin veya ana sayfaya dönün.
        </p>

        {/* Back to Home Link */}
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ 
            backgroundColor: 'var(--color-primary-400)',
            color: 'var(--color-surface)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary-400)';
          }}
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          <span>Ana Sayfaya Dön</span>
        </Link>
      </div>
    </div>
  );
}
