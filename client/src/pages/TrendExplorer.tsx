import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, FilePlus, Loader2, Globe, BarChart3 } from 'lucide-react';
import api from '../services/api';
import type { Trend } from '../types';

interface TrendCardProps {
  trend: Trend;
  onCreateArticle: (topic: string) => void;
  isLoading: boolean;
}

function TrendCard({ trend, onCreateArticle, isLoading }: TrendCardProps) {
  const handleClick = () => {
    if (!isLoading) {
      onCreateArticle(trend.topic);
    }
  };

  return (
    <div className="group bg-surface-alt border border-border rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary-400/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text truncate" title={trend.topic}>
            {trend.topic}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-primary-400" aria-hidden="true" />
              <span className="tabular-nums">{trend.score.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-accent-400" aria-hidden="true" />
              {trend.region}
            </span>
            <span className="text-text-subtle">{trend.language}</span>
          </div>
        </div>
        <button
          onClick={handleClick}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer bg-primary-400/10 text-primary-400 hover:bg-primary-400 hover:text-surface focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          aria-label={`Create article about ${trend.topic}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <FilePlus className="w-4 h-4" aria-hidden="true" />
              <span>Create Article</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function TrendExplorer() {
  const navigate = useNavigate();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingArticle, setCreatingArticle] = useState<string | null>(null);

  useEffect(() => {
    loadTrends();
  }, []);

  const loadTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/trends');
      setTrends(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async (topic: string) => {
    setCreatingArticle(topic);
    // Simulate a brief loading state for UX feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    navigate(`/content?topic=${encodeURIComponent(topic)}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Trend Explorer</h1>
          <p className="text-dark-400 mt-1">Güncel trendleri keşfedin</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" aria-hidden="true" />
          <span className="ml-3 text-text-muted">Loading trends...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Trend Explorer</h1>
          <p className="text-dark-400 mt-1">Güncel trendleri keşfedin</p>
        </div>
        <div className="bg-error/10 border border-error/30 rounded-xl p-8 text-center">
          <p className="text-error mb-4">{error}</p>
          <button
            onClick={loadTrends}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-400 text-surface hover:bg-primary-500 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Trend Explorer</h1>
          <p className="text-dark-400 mt-1">Güncel trendleri keşfedin</p>
        </div>
        <div className="bg-surface-alt border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-primary-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-primary-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium text-text">No Trends Available</h3>
          <p className="text-text-muted mt-1">Check back later for trending topics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trend Explorer</h1>
        <p className="text-dark-400 mt-1">Güncel trendleri keşfedin</p>
      </div>

      <div className="grid gap-4">
        {trends.map((trend) => (
          <TrendCard
            key={trend.id}
            trend={trend}
            onCreateArticle={handleCreateArticle}
            isLoading={creatingArticle === trend.topic}
          />
        ))}
      </div>
    </div>
  );
}
