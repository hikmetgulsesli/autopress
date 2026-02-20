import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  Save, 
  Eye, 
  Globe, 
  FileText, 
  Image as ImageIcon,
  Tag,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  X
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import slugify from 'slugify';
import api from '../services/api';
import { useSiteStore } from '../store/siteStore';
import type { Article } from '../types';

// Types
interface SEOPreview {
  title: string;
  metaDescription: string;
  slug: string;
  url: string;
}

interface ContentFormData {
  title: string;
  content: string;
  metaDescription: string;
  slug: string;
  excerpt: string;
  category: string;
  featuredImageUrl: string;
  siteId: number | null;
  status: 'draft' | 'review' | 'scheduled' | 'published';
  language: string;
}

interface AIContentOptions {
  topic: string;
  contentType: 'blog' | 'listicle' | 'howto' | 'faq';
  language: string;
  wordCount: number;
  keywords: string[];
}

// Constants
const MAX_TITLE_LENGTH = 60;
const MAX_META_LENGTH = 160;
const MAX_EXCERPT_LENGTH = 200;

const CONTENT_TYPES = [
  { value: 'blog', label: 'Blog Post' },
  { value: 'listicle', label: 'Listicle' },
  { value: 'howto', label: 'How-To Guide' },
  { value: 'faq', label: 'FAQ' },
] as const;

const LANGUAGES = [
  { value: 'TR', label: 'Türkçe' },
  { value: 'EN', label: 'English' },
  { value: 'DE', label: 'Deutsch' },
  { value: 'FR', label: 'Français' },
  { value: 'ES', label: 'Español' },
  { value: 'AR', label: 'العربية' },
] as const;

// Character Counter Component
function CharacterCounter({ current, max, label }: { current: number; max: number; label: string }) {
  const percentage = Math.min((current / max) * 100, 100);
  const isOverLimit = current > max;
  const isNearLimit = percentage > 80 && !isOverLimit;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-text-muted">{label}</span>
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-200 ${
            isOverLimit ? 'bg-error' : isNearLimit ? 'bg-warning' : 'bg-success'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`tabular-nums ${isOverLimit ? 'text-error' : isNearLimit ? 'text-warning' : 'text-text-muted'}`}>
        {current}/{max}
      </span>
    </div>
  );
}

// SEO Preview Panel Component
function SEOPreviewPanel({ preview, siteDomain }: { preview: SEOPreview; siteDomain: string }) {
  const displayUrl = siteDomain 
    ? `https://${siteDomain}/${preview.slug}`
    : `example.com/${preview.slug || 'your-article-slug'}`;

  const truncatedTitle = preview.title.length > MAX_TITLE_LENGTH 
    ? preview.title.slice(0, MAX_TITLE_LENGTH - 3) + '...'
    : preview.title;

  const truncatedMeta = preview.metaDescription.length > MAX_META_LENGTH
    ? preview.metaDescription.slice(0, MAX_META_LENGTH - 3) + '...'
    : preview.metaDescription;

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-primary-400" />
        Google SERP Preview
      </h3>
      
      <div className="bg-white rounded-lg p-4 font-sans">
        {/* Google Search Result Simulation */}
        <div className="max-w-[600px]">
          {/* URL breadcrumb style */}
          <div className="flex items-center gap-1 text-xs text-[#5f6368] mb-1">
            <span>{siteDomain || 'example.com'}</span>
            <span className="text-[#bdc1c6]">›</span>
            <span className="truncate">{preview.slug || 'your-article-slug'}</span>
          </div>
          
          {/* Title */}
          <h4 
            className="text-[#1a0dab] text-xl leading-tight hover:underline cursor-pointer mb-1"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {truncatedTitle || 'Your Article Title'}
          </h4>
          
          {/* Meta Description */}
          <p className="text-[#4d5156] text-sm leading-relaxed line-clamp-2">
            {truncatedMeta || 'Your meta description will appear here. Write a compelling description to improve click-through rates from search results.'}
          </p>
        </div>
      </div>

      {/* SEO Score Indicators */}
      <div className="mt-4 space-y-3 pt-4 border-t border-border">
        <CharacterCounter 
          current={preview.title.length} 
          max={MAX_TITLE_LENGTH} 
          label="Title"
        />
        
        <CharacterCounter 
          current={preview.metaDescription.length} 
          max={MAX_META_LENGTH} 
          label="Meta"
        />
      </div>
    </div>
  );
}

// TipTap Editor Component
function TipTapEditor({ 
  content, 
  onChange, 
  placeholder = 'Start writing...' 
}: { 
  content: string; 
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-surface-alt">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-surface transition-colors ${
            editor.isActive('bold') ? 'bg-primary-400/20 text-primary-400' : 'text-text-muted'
          }`}
          aria-label="Bold"
        >
          <strong className="w-4 h-4 flex items-center justify-center text-sm">B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-surface transition-colors ${
            editor.isActive('italic') ? 'bg-primary-400/20 text-primary-400' : 'text-text-muted'
          }`}
          aria-label="Italic"
        >
          <em className="w-4 h-4 flex items-center justify-center text-sm">I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-surface transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-primary-400/20 text-primary-400' : 'text-text-muted'
          }`}
          aria-label="Heading 2"
        >
          <span className="text-xs font-semibold">H2</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded hover:bg-surface transition-colors ${
            editor.isActive('heading', { level: 3 }) ? 'bg-primary-400/20 text-primary-400' : 'text-text-muted'
          }`}
          aria-label="Heading 3"
        >
          <span className="text-xs font-semibold">H3</span>
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-surface transition-colors ${
            editor.isActive('bulletList') ? 'bg-primary-400/20 text-primary-400' : 'text-text-muted'
          }`}
          aria-label="Bullet List"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-surface transition-colors ${
            editor.isActive('orderedList') ? 'bg-primary-400/20 text-primary-400' : 'text-text-muted'
          }`}
          aria-label="Numbered List"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
          </svg>
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-surface transition-colors text-text-muted disabled:opacity-30"
          aria-label="Undo"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-surface transition-colors text-text-muted disabled:opacity-30"
          aria-label="Redo"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
          </svg>
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="prose prose-invert max-w-none p-4 min-h-[300px] focus:outline-none"
      />
    </div>
  );
}

// AI Generate Modal
function AIGenerateModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: AIContentOptions) => void;
  isGenerating: boolean;
}) {
  const [options, setOptions] = useState<AIContentOptions>({
    topic: '',
    contentType: 'blog',
    language: 'TR',
    wordCount: 1200,
    keywords: [],
  });
  const [keywordInput, setKeywordInput] = useState('');

  if (!isOpen) return null;

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !options.keywords.includes(keywordInput.trim())) {
      setOptions(prev => ({ ...prev, keywords: [...prev.keywords, keywordInput.trim()] }));
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setOptions(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== keyword) }));
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-alt border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-400" />
              AI Content Generator
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Topic <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={options.topic}
                onChange={(e) => setOptions(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g., Sustainable Living Tips"
                className="input"
              />
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Content Type
              </label>
              <select
                value={options.contentType}
                onChange={(e) => setOptions(prev => ({ ...prev, contentType: e.target.value as AIContentOptions['contentType'] }))}
                className="input"
              >
                {CONTENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Language
              </label>
              <select
                value={options.language}
                onChange={(e) => setOptions(prev => ({ ...prev, language: e.target.value }))}
                className="input"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            {/* Word Count */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Word Count: <span className="text-primary-400">{options.wordCount}</span>
              </label>
              <input
                type="range"
                min="800"
                max="2000"
                step="100"
                value={options.wordCount}
                onChange={(e) => setOptions(prev => ({ ...prev, wordCount: Number(e.target.value) }))}
                className="w-full accent-primary-400"
              />
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>800</span>
                <span>2000</span>
              </div>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Keywords (optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                  placeholder="Add keyword and press Enter"
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="px-3 py-2 bg-surface border border-border rounded-lg text-text hover:border-primary-400 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {options.keywords.map(keyword => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary-400/10 text-primary-400 text-sm rounded-full"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="hover:text-error"
                      aria-label={`Remove ${keyword}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-text hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onGenerate(options)}
              disabled={!options.topic.trim() || isGenerating}
              className="flex-1 px-4 py-2 bg-accent-400 text-surface rounded-lg font-medium hover:bg-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main ContentStudio Component
export default function ContentStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('edit');
  
  const { sites, fetchSites } = useSiteStore();
  
  const [formData, setFormData] = useState<ContentFormData>({
    title: '',
    content: '',
    metaDescription: '',
    slug: '',
    excerpt: '',
    category: '',
    featuredImageUrl: '',
    siteId: null,
    status: 'draft',
    language: 'TR',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch sites on mount
  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Load article if editing
  useEffect(() => {
    if (articleId) {
      loadArticle(Number(articleId));
    }
  }, [articleId]);

  const loadArticle = async (id: number) => {
    setIsLoading(true);
    try {
      const { data } = await api.get<Article>(`/articles/${id}`);
      setFormData({
        title: data.title,
        content: data.content,
        metaDescription: data.meta_description,
        slug: data.slug,
        excerpt: data.excerpt,
        category: '',
        featuredImageUrl: data.featured_image_url || '',
        siteId: data.site_id,
        status: data.status,
        language: data.language.toUpperCase(),
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load article');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && !articleId) {
      const newSlug = slugify(formData.title, { 
        lower: true, 
        strict: true,
        remove: /[*+~.(){}\[\]\\/:;@"'?!,<>#^|=]/g 
      });
      setFormData(prev => ({ ...prev, slug: newSlug }));
    }
  }, [formData.title, articleId]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        site_id: formData.siteId,
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || formData.metaDescription.slice(0, 200),
        status: formData.status,
        language: formData.language.toLowerCase(),
        meta_title: formData.title,
        meta_description: formData.metaDescription,
        featured_image_url: formData.featuredImageUrl || null,
      };

      if (articleId) {
        await api.put(`/articles/${articleId}`, payload);
        setSuccess('Article updated successfully');
      } else {
        const { data } = await api.post('/articles', payload);
        setSuccess('Article created successfully');
        navigate(`/content?edit=${data.id}`, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save article');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIGenerate = async (options: AIContentOptions) => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data } = await api.post('/content/generate', options);
      
      setFormData(prev => ({
        ...prev,
        title: data.title,
        content: data.content,
        metaDescription: data.metaDescription,
        slug: data.slug,
        excerpt: data.excerpt,
      }));

      setSuccess('Content generated successfully');
      setShowAIModal(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedSite = sites.find(s => s.id === formData.siteId);

  const seoPreview: SEOPreview = {
    title: formData.title,
    metaDescription: formData.metaDescription,
    slug: formData.slug,
    url: selectedSite ? `${selectedSite.domain}/${formData.slug}` : '',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">
            {articleId ? 'Edit Article' : 'Content Studio'}
          </h1>
          <p className="text-text-muted mt-1">
            {articleId ? 'Update your article content' : 'Create SEO-optimized content with AI assistance'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAIModal(true)}
            className="btn btn-accent"
          >
            <Sparkles className="w-4 h-4" />
            AI Generate
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={isSaving || !formData.title.trim()}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {articleId ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-error/10 border border-error/20 rounded-lg text-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-success/10 border border-success/20 rounded-lg text-success">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="card space-y-3">
            <label htmlFor="title" className="block text-sm font-medium text-text">
              <FileText className="w-4 h-4 inline mr-1.5" />
              Title
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter article title..."
              className="input text-lg"
              required
            />
            <CharacterCounter 
              current={formData.title.length} 
              max={MAX_TITLE_LENGTH} 
              label="Title length"
            />
          </div>

          {/* Content Editor */}
          <div className="card space-y-3">
            <label className="block text-sm font-medium text-text">
              <FileText className="w-4 h-4 inline mr-1.5" />
              Content
            </label>
            <TipTapEditor
              content={formData.content}
              onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
              placeholder="Start writing your article..."
            />
          </div>

          {/* Meta Description */}
          <div className="card space-y-3">
            <label htmlFor="metaDescription" className="block text-sm font-medium text-text">
              <Tag className="w-4 h-4 inline mr-1.5" />
              Meta Description
            </label>
            <textarea
              id="metaDescription"
              value={formData.metaDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
              placeholder="Enter meta description for SEO..."
              rows={3}
              className="input resize-none"
            />
            <CharacterCounter 
              current={formData.metaDescription.length} 
              max={MAX_META_LENGTH} 
              label="Meta description"
            />
          </div>

          {/* Excerpt */}
          <div className="card space-y-3">
            <label htmlFor="excerpt" className="block text-sm font-medium text-text">
              <FileText className="w-4 h-4 inline mr-1.5" />
              Excerpt
            </label>
            <textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Brief summary of the article..."
              rows={2}
              className="input resize-none"
            />
            <CharacterCounter 
              current={formData.excerpt.length} 
              max={MAX_EXCERPT_LENGTH} 
              label="Excerpt"
            />
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* SEO Preview */}
          <SEOPreviewPanel 
            preview={seoPreview} 
            siteDomain={selectedSite?.domain || ''}
          />

          {/* Publishing Options */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary-400" />
              Publishing
            </h3>

            {/* Site Selection */}
            <div>
              <label htmlFor="site" className="block text-sm text-text-muted mb-1.5">
                Site
              </label>
              <select
                id="site"
                value={formData.siteId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, siteId: e.target.value ? Number(e.target.value) : null }))}
                className="input"
              >
                <option value="">Select a site</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm text-text-muted mb-1.5">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ContentFormData['status'] }))}
                className="input"
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label htmlFor="language" className="block text-sm text-text-muted mb-1.5">
                Language
              </label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                className="input"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Slug & URL */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary-400" />
              URL Settings
            </h3>

            <div>
              <label htmlFor="slug" className="block text-sm text-text-muted mb-1.5">
                Slug
              </label>
              <input
                id="slug"
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="article-slug"
                className="input font-mono text-sm"
              />
              <p className="text-xs text-text-muted mt-1.5">
                Auto-generated from title
              </p>
            </div>
          </div>

          {/* Featured Image */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary-400" />
              Featured Image
            </h3>

            <div>
              <label htmlFor="featuredImage" className="block text-sm text-text-muted mb-1.5">
                Image URL
              </label>
              <input
                id="featuredImage"
                type="url"
                value={formData.featuredImageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, featuredImageUrl: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className="input"
              />
            </div>

            {formData.featuredImageUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-surface">
                <img
                  src={formData.featuredImageUrl}
                  alt="Featured preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="1"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpolyline points="21 15 16 10 5 21"/%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </form>

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={handleAIGenerate}
        isGenerating={isGenerating}
      />
    </div>
  );
}
