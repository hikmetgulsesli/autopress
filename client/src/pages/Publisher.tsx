import { Send } from 'lucide-react';

export default function Publisher() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Yayıncı</h1>
        <p className="text-dark-400 mt-1">Makalelerinizi zamanlayın ve yayınlayın</p>
      </div>
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-medium text-dark-300">Yayıncı</h3>
        <p className="text-dark-500 mt-1">Faz 3'te aktif olacak</p>
      </div>
    </div>
  );
}
