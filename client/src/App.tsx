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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sites" element={<SiteManager />} />
                <Route path="/content" element={<ContentStudio />} />
                <Route path="/publisher" element={<Publisher />} />
                <Route path="/trends" element={<TrendExplorer />} />
                <Route path="/seo" element={<SEOTools />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
