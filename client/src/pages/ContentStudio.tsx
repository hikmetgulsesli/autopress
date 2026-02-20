import { useState } from 'react';
import { Sparkles, Save, Eye, Image as ImageIcon, X } from 'lucide-react';
import TipTapEditor from '../components/content/TipTapEditor';
import ImageSearch, { ImageSearchResult, ImageAttribution } from '../components/content/ImageSearch';

export default function ContentStudio() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<ImageSearchResult | null>(null);

  const handleImageSelect = (image: ImageSearchResult) => {
    setFeaturedImage(image);
    setShowImageSearch(false);
  };

  const handleRemoveImage = () => {
    setFeaturedImage(null);
  };

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

      {/* Featured Image */}
      <div className="bg-surface-alt border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text">Öne Çıkan Görsel</h3>
          <button
            type="button"
            onClick={() => setShowImageSearch(!showImageSearch)}
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            <ImageIcon className="w-4 h-4" />
            {featuredImage ? 'Değiştir' : 'Görsel Seç'}
          </button>
        </div>

        {featuredImage ? (
          <div className="relative rounded-lg overflow-hidden">
            <img
              src={featuredImage.url}
              alt={featuredImage.alt || 'Featured image'}
              className="w-full h-48 object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60">
              <ImageAttribution image={featuredImage} />
            </div>
          </div>
        ) : showImageSearch ? null : (
          <div 
            onClick={() => setShowImageSearch(true)}
            className="border-2 border-dashed border-border rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-primary-400 transition-colors"
          >
            <p className="text-text-muted text-sm">Öne çıkan görsel eklemek için tıklayın</p>
          </div>
        )}
      </div>

      {/* Image Search Modal */}
      {showImageSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text">Görsel Ara</h2>
              <button
                type="button"
                onClick={() => setShowImageSearch(false)}
                className="p-2 text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <ImageSearch onSelect={handleImageSelect} />
            </div>
          </div>
        </div>
      )}

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
          className="flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">AI ile içerik üret</span>
        </button>
      </div>
    </div>
  );
}
