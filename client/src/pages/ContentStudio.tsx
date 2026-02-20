import { useState } from 'react';
import { Sparkles, Save, Eye, FileText } from 'lucide-react';
import TipTapEditor from '../components/content/TipTapEditor';

export default function ContentStudio() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">İçerik Stüdyosu</h1>
          <p className="text-text-muted mt-1">AI ile SEO uyumlu içerik üretin</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-ghost"
          >
            <Eye className="w-4 h-4" />
            Önizleme
          </button>
          <button
            type="button"
            className="btn btn-primary"
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </div>

      {/* Title Input */}
      <div className="bg-surface-alt border border-border rounded-xl p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Başlık girin..."
          className="w-full bg-transparent text-xl font-bold text-text placeholder:text-text-muted focus:outline-none"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('write')}
          className={`
            flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200
            border-b-2 -mb-px
            ${activeTab === 'write'
              ? 'text-primary-400 border-primary-400'
              : 'text-text-muted border-transparent hover:text-text'
            }
          `}
        >
          <FileText className="w-4 h-4" />
          Yaz
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`
            flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200
            border-b-2 -mb-px
            ${activeTab === 'preview'
              ? 'text-primary-400 border-primary-400'
              : 'text-text-muted border-transparent hover:text-text'
            }
          `}
        >
          <Eye className="w-4 h-4" />
          Önizleme
        </button>
      </div>

      {/* Editor / Preview */}
      {activeTab === 'write' ? (
        <TipTapEditor
          content={content}
          onChange={setContent}
          placeholder="İçeriğinizi buraya yazın..."
        />
      ) : (
        <div 
          className="bg-surface-alt border border-border rounded-xl p-6 min-h-[400px] prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content || '<p class="text-text-muted">İçerik henüz yok</p>' }}
        />
      )}

      {/* AI Assist Section */}
      <div className="bg-surface-alt border border-border rounded-xl p-4">
        <button
          type="button"
          className="flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">AI ile içerik üret</span>
        </button>
      </div>
    </div>
  );
}
