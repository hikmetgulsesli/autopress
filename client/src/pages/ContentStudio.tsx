import { useState } from 'react';
import { PenTool, Sparkles, Save, Eye } from 'lucide-react';
import { TipTapEditor } from '../components/TipTapEditor';

export default function ContentStudio() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  const handleSave = () => {
    // TODO: Save article to backend
    console.log('Saving article:', { title, content });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">İçerik Stüdyosu</h1>
          <p className="text-dark-400 mt-1">AI ile SEO uyumlu içerik üretin</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              transition-all duration-200 cursor-pointer
              ${isPreview 
                ? 'bg-primary-400/20 text-primary-400' 
                : 'bg-surface-alt text-text-muted hover:text-text hover:bg-surface-elevated'
              }
              focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface
            `}
          >
            <Eye className="w-4 h-4" />
            {isPreview ? 'Düzenle' : 'Önizleme'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              bg-primary-400 text-surface
              hover:bg-primary-500
              transition-all duration-200 cursor-pointer
              focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface
            "
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </div>

      {/* Editor Container */}
      <div className="space-y-4">
        {/* Title Input */}
        <div className="space-y-2">
          <label htmlFor="article-title" className="block text-sm font-medium text-text">
            Başlık
          </label>
          <input
            id="article-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Makale başlığını girin..."
            className="
              w-full px-4 py-3 bg-surface-alt border border-border rounded-xl
              text-text text-lg font-medium
              placeholder:text-text-muted
              focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400
              transition-all duration-200
            "
          />
        </div>

        {/* Content Editor */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text">
            İçerik
          </label>
          {isPreview ? (
            <div 
              className="
                border border-border rounded-xl overflow-hidden 
                bg-surface-alt min-h-[300px] px-4 py-3
                prose prose-invert prose-zinc max-w-none
              "
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <TipTapEditor
              content={content}
              onChange={setContent}
              placeholder="Makale içeriğini yazmaya başlayın..."
            />
          )}
        </div>
      </div>

      {/* AI Assistant Card */}
      <div className="bg-surface-alt border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-accent-400/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-accent-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text">AI İçerik Asistanı</h3>
            <p className="text-text-muted mt-1">
              Yapay zeka ile içerik önerileri alın, SEO analizi yapın ve yazım hatalarını düzeltin.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                className="
                  inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                  bg-surface text-text-muted
                  hover:text-text hover:bg-surface-elevated
                  transition-all duration-200 cursor-pointer
                  border border-border
                "
              >
                <PenTool className="w-3.5 h-3.5" />
                Başlık Öner
              </button>
              <button
                type="button"
                className="
                  inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                  bg-surface text-text-muted
                  hover:text-text hover:bg-surface-elevated
                  transition-all duration-200 cursor-pointer
                  border border-border
                "
              >
                <Sparkles className="w-3.5 h-3.5" />
                SEO Analizi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
