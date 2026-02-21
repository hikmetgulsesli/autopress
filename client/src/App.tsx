import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SiteManager from './pages/SiteManager';
import ContentStudio from './pages/ContentStudio';
import Publisher from './pages/Publisher';
import TrendExplorer from './pages/TrendExplorer';
import SEOTools from './pages/SEOTools';
import Settings from './pages/Settings';
import SecurityDashboard from './pages/SecurityDashboard';
import NotFound from './pages/NotFound';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-400 text-sm">Yükleniyor...</span>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsAuthChecking(false);
    };
    initAuth();
  }, [checkAuth]);

  if (isAuthChecking) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sites" element={<SiteManager />} />
                <Route path="/content" element={<ContentStudio />} />
                <Route path="/publisher" element={<Publisher />} />
                <Route path="/trends" element={<TrendExplorer />} />
                <Route path="/seo" element={<SEOTools />} />
                <Route path="/security" element={<SecurityDashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}
