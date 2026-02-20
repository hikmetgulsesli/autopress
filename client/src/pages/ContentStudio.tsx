import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PenTool, Sparkles, Loader2, Send, Settings, FileText } from 'lucide-react';
import api from '../services/api';

interface ArticleFormData {
  topic: string;
  contentType: 'blog' | 'listicle' | 'howto' | 'faq';
  language: 'TR' | 'EN' | 'DE' | 'FR' | 'ES' | 'AR';
  wordCount: number;
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative';
  keywords: string;
}

const contentTypes = [
  { value: 'blog', label: 'Blog Post', icon: FileText },
  { value: 'listicle', label: 'Listicle', icon: Sparkles },
  { value: 'howto', label: 'How-To Guide', icon: PenTool },
  { value: 'faq', label: 'FAQ', icon: Settings },
] as const;

const languages = [
  { value: 'TR', label: 'Türkçe' },
  { value: 'EN', label: 'English' },
  { value: 'DE', label: 'Deutsch' },
  { value: 'FR', label: 'Français' },
  { value: 'ES', label: 'Español' },
  { value: 'AR', label: 'العربية' },
] as const;

const tones = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
] as const;

export default function ContentStudio() {
  const [searchParams] = useSearchParams();
  const topicFromUrl = searchParams.get('topic');

  const [formData, setFormData] = useState<ArticleFormData>({
    topic: topicFromUrl || '',
    contentType: 'blog',
    language: 'EN',
    wordCount: 1000,
    tone: 'professional',
    keywords: '',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update form when URL parameter changes
  useEffect(() => {
    if (topicFromUrl) {
      setFormData(prev => ({ ...prev, topic: topicFromUrl }));
    }
  }, [topicFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const response = await api.post('/articles/generate', {
        topic: formData.topic,
        contentType: formData.contentType,
        language: formData.language,
        wordCount: formData.wordCount,
        tone: formData.tone,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
      });

      setGeneratedContent(response.data.content);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate article');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChange = (field: keyof ArticleFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">İçerik Stüdyosu</h1>
        <p className="text-dark-400 mt-1">AI ile SEO uyumlu içerik üretin</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic Input */}
        <div className="bg-surface-alt border border-border rounded-xl p-6 space-y-4">
          <label htmlFor="topic" className="block text-sm font-medium text-text">
            Topic
            {topicFromUrl && (
              <span className="ml-2 text-xs text-primary-400 bg-primary-400/10 px-2 py-0.5 rounded-full">
                From Trend
              </span>
            )}
          </label>
          <input
            id="topic"
            type="text"
            value={formData.topic}
            onChange={(e) => handleInputChange('topic', e.target.value)}
            placeholder="Enter your article topic..."
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-colors"
            required
          />
        </div>

        {/* Content Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Content Type */}
          <div className="bg-surface-alt border border-border rounded-xl p-6 space-y-4">
            <label className="block text-sm font-medium text-text">Content Type</label>
            <div className="grid grid-cols-2 gap-3">
              {contentTypes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleInputChange('contentType', value)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                    formData.contentType === value
                      ? 'bg-primary-400 text-surface'
                      : 'bg-surface border border-border text-text-muted hover:text-text hover:border-primary-400/50'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="bg-surface-alt border border-border rounded-xl p-6 space-y-4">
            <label htmlFor="language" className="block text-sm font-medium text-text">Language</label>
            <select
              id="language"
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-colors cursor-pointer"
            >
              {languages.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Word Count */}
          <div className="bg-surface-alt border border-border rounded-xl p-6 space-y-4">
            <label htmlFor="wordCount" className="block text-sm font-medium text-text">
              Word Count: <span className="text-primary-400 tabular-nums">{formData.wordCount}</span>
            </label>
            <input
              id="wordCount"
              type="range"
              min={800}
              max={2000}
              step={100}
              value={formData.wordCount}
              onChange={(e) => handleInputChange('wordCount', parseInt(e.target.value))}
              className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary-400"
            />
            <div className="flex justify-between text-xs text-text-subtle">
              <span>800</span>
              <span>2000</span>
            </div>
          </div>

          {/* Tone */}
          <div className="bg-surface-alt border border-border rounded-xl p-6 space-y-4">
            <label htmlFor="tone" className="block text-sm font-medium text-text">Tone</label>
            <select
              id="tone"
              value={formData.tone}
              onChange={(e) => handleInputChange('tone', e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-colors cursor-pointer"
            >
              {tones.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Keywords */}
        <div className="bg-surface-alt border border-border rounded-xl p-6 space-y-4">
          <label htmlFor="keywords" className="block text-sm font-medium text-text">
            Target Keywords
            <span className="text-text-subtle font-normal ml-2">(optional, comma-separated)</span>
          </label>
          <input
            id="keywords"
            type="text"
            value={formData.keywords}
            onChange={(e) => handleInputChange('keywords', e.target.value)}
            placeholder="e.g., SEO, content marketing, digital strategy"
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-colors"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg p-4 text-error text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || !formData.topic.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold transition-all duration-200 cursor-pointer bg-primary-400 text-surface hover:bg-primary-500 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Generating Article...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" aria-hidden="true" />
              <span>Generate with AI</span>
            </>
          )}
        </button>
      </form>

      {/* Generated Content Preview */}
      {generatedContent && (
        <div className="bg-surface-alt border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Generated Content</h3>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer bg-accent-400 text-surface hover:bg-accent-500 focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              Publish
            </button>
          </div>
          <div className="prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-text-muted text-sm leading-relaxed">
              {generatedContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
