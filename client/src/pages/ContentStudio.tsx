import { PenTool, Sparkles } from 'lucide-react';

export default function ContentStudio() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">İçerik Stüdyosu</h1>
        <p className="text-dark-400 mt-1">AI ile SEO uyumlu içerik üretin</p>
      </div>
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-lg font-medium text-dark-300">İçerik Stüdyosu</h3>
        <p className="text-dark-500 mt-1">Faz 2'de aktif olacak</p>
      </div>
    </div>
  );
}
