import { TrendingUp } from 'lucide-react';

export default function TrendExplorer() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trend Explorer</h1>
        <p className="text-dark-400 mt-1">Güncel trendleri keşfedin</p>
      </div>
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-medium text-dark-300">Trend Explorer</h3>
        <p className="text-dark-500 mt-1">Faz 4'te aktif olacak</p>
      </div>
    </div>
  );
}
