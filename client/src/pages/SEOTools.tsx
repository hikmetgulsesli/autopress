import { Search } from 'lucide-react';

export default function SEOTools() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">SEO Araçları</h1>
        <p className="text-dark-400 mt-1">Makalelerinizin SEO performansını analiz edin</p>
      </div>
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-amber-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-medium text-dark-300">SEO Araçları</h3>
        <p className="text-dark-500 mt-1">Faz 5'te aktif olacak</p>
      </div>
    </div>
  );
}
