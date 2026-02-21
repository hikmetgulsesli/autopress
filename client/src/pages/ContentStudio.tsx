import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PenTool, Sparkles, Save, Eye, Image as ImageIcon, X, Loader2, AlertCircle, Search, Globe, Languages, CheckCircle2, TrendingUp } from 'lucide-react';
import { TipTapEditor } from '../components/TipTapEditor';
import { SEOPanel } from '../components/SEOPanel';
import ImageSearch from '../components/ImageSearch';
import ImageAttribution from '../components/ImageAttribution';
import api from '../services/api';
import { notify } from '../utils/toast';
import type { ImageSearchResult, Article, Site } from '../types';

type TabType = 'featured-image' | 'seo' | 'ai-assistant';

interface TitleSuggestionResponse {
  suggestions: string[];
}

interface SEOAnalysisResponse {
  score: number;
  suggestions: string[];
  metrics: Record<string, number | string>;
}

export default function ContentStudio() {
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('article');
  const topicParam = searchParams.get('topic');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<ImageSearchResult | null>(null);
  const [showImageSearch, setShowImageSearch] = useState(false);

  // SEO state (US-006)
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [slug, setSlug] = useState('');

  // Site and Language Selection (US-007)
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('tr');
  const [isLoadingSites, setIsLoadingSites] = useState(false);

  // Available languages
  const availableLanguages = [
    { code: 'tr', name: 'Türkçe' },
    { code: 'en', name: 'English' },
  ];

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('featured-image');

  // Article loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedArticle, setLoadedArticle] = useState<Article | null>(null);

  // AI Assistant state (US-001)
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [isAnalyzingSEO, setIsAnalyzingSEO] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysisResponse | null>(null);
  const [showSEOAnalysis, setShowSEOAnalysis] = useState(false);

  // Set title from topic parameter when no article is being loaded
  useEffect(() => {
    if (topicParam && !articleId && !title) {
      setTitle(topicParam);
    }
  }, [topicParam, articleId, title]);

  // Fetch article from URL param
  useEffect(() => {
    if (!articleId) return;

    const fetchArticle = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get<Article>(`/articles/${articleId}`);
        const article = response.data;

        setLoadedArticle(article);
        setTitle(article.title || '');
        setContent(article.content || '');

        // Set SEO data (US-006)
        setMetaTitle(article.meta_title || '');
        setMetaDescription(article.meta_description || '');
        setSlug(article.slug || '');

        // Set featured image if available
        if (article.featured_image_url) {
          setFeaturedImage({
            id: String(article.id),
            url: article.featured_image_url,
            thumbUrl: article.featured_image_url,
            description: null,
            altDescription: null,
            width: 0,
            height: 0,
            photographer: { name: '', username: '', portfolioUrl: '' },
            color: null,
          });
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Makale bulunamadı');
        } else {
          setError(err.response?.data?.error || 'Makale yüklenirken bir hata oluştu');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  // Fetch user's sites on mount (US-007)
  useEffect(() => {
    const fetchSites = async () => {
      setIsLoadingSites(true);
      try {
        const response = await api.get<Site[]>('/sites');
        setSites(response.data);
        // Set default to first site if available
        if (response.data.length > 0 && !selectedSiteId) {
          setSelectedSiteId(response.data[0].id);
          // Also set language from site default
          if (response.data[0].language) {
            setSelectedLanguage(response.data[0].language);
          }
        }
      } catch (err) {
        console.error('Failed to fetch sites:', err);
      } finally {
        setIsLoadingSites(false);
      }
    };

    fetchSites();
  }, []);

  // Load article's site and language when article is loaded (US-007)
  useEffect(() => {
    if (loadedArticle) {
      if (loadedArticle.site_id) {
        setSelectedSiteId(loadedArticle.site_id);
      }
      if (loadedArticle.language) {
        setSelectedLanguage(loadedArticle.language);
      }
    }
  }, [loadedArticle]);

  const handleSave = async () => {
    // Calculate word count and reading time
    const text = `${title} ${content}`.trim();
    const wordCount = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
    const readingTime = Math.ceil(wordCount / 200);

    const articleData = {
      title,
      content,
      site_id: selectedSiteId,
      language: selectedLanguage,
      featured_image_url: featuredImage?.url || null,
      meta_title: metaTitle,
      meta_description: metaDescription,
      slug,
      word_count: wordCount,
      reading_time: readingTime,
    };

    try {
      if (loadedArticle?.id) {
        await api.put(`/articles/${loadedArticle.id}`, articleData);
        notify.success('Makale ba\u015Far\u0131yla g\u00FCncellendi');
      } else {
        await api.post('/articles', articleData);
        notify.success('Makale ba\u015Far\u0131yla kaydedildi');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Bir hata olu\u015Ftu';
      notify.error(errorMessage);
    }
  };

  const handleSelectImage = (image: ImageSearchResult) => {
    setFeaturedImage(image);
    setShowImageSearch(false);
  };

  const handleRemoveImage = () => {
    setFeaturedImage(null);
  };

  // AI Assistant: Suggest Title (US-001)
  const handleSuggestTitle = async () => {
    if (!title && !content) {
      notify.error('Lütfen önce başlık veya içerik girin');
      return;
    }

    setIsSuggestingTitle(true);
    setError(null);

    try {
      const response = await api.post<TitleSuggestionResponse>('/content/suggest-title', {
        title,
        content,
        language: selectedLanguage,
      });

      setTitleSuggestions(response.data.suggestions);
      setShowTitleSuggestions(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Başlık önerileri alınamadı';
      notify.error(errorMessage);
    } finally {
      setIsSuggestingTitle(false);
    }
  };

  // AI Assistant: Select Title Suggestion (US-001)
  const handleSelectTitleSuggestion = (suggestion: string) => {
    setTitle(suggestion);
    setShowTitleSuggestions(false);
    notify.success('Başlık güncellendi');
  };

  // AI Assistant: SEO Analysis (US-001)
  const handleAnalyzeSEO = async () => {
    if (!title || !content) {
      notify.error('Lütfen önce başlık ve içerik girin');
      return;
    }

    setIsAnalyzingSEO(true);
    setError(null);

    try {
      const response = await api.post<SEOAnalysisResponse>('/content/analyze-seo', {
        title,
        content,
        slug,
      });

      setSeoAnalysis(response.data);
      setShowSEOAnalysis(true);
      notify.success('SEO analizi tamamlandı');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'SEO analizi yapılamadı';
      notify.error(errorMessage);
    } finally {
      setIsAnalyzingSEO(false);
    }
  };

  // Get SEO score color
  const getSEOscoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  };

  // Get SEO score label
  const getSEOScoreLabel = (score: number) => {
    if (score >= 80) return 'İyi';
    if (score >= 60) return 'Orta';
    return 'Geliştirilmeli';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 data-testid="loading-spinner" className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-text-muted">Makale y\u00FCkleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-error" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Y\u00FCkleme Hatas\u0131</h2>
            <p className="text-text-muted mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {loadedArticle ? 'Makale D\u00FCzenle' : topicParam ? `Makale Olu\u015Ftur: ${topicParam}` : '\u0130\u00E7erik St\u00FCdyosu'}
          </h1>
          <p className="text-dark-400 mt-1">AI ile SEO uyumlu i\u00E7erik \u00FCretin</p>

          {/* Site and Language Selection (US-007) */}
          <div className="flex items-center gap-3 mt-4">
            {/* Site Dropdown */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-text-muted" />
              <select
                id="site-select"
                name="site"
                aria-label="Site se\u00E7in"
                value={selectedSiteId || ''}
                onChange={(e) => setSelectedSiteId(Number(e.target.value))}
                disabled={isLoadingSites}
                className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-text text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200 cursor-pointer min-w-[180px]"
                style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
              >
                <option value="" disabled>Site se\u00E7in</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Dropdown */}
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-text-muted" />
              <select
                id="language-select"
                name="language"
                aria-label="Dil se\u00E7in"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-text text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200 cursor-pointer min-w-[120px]"
                style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
              >
                {availableLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {isLoadingSites && (
              <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
            )}
          </div>
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
            {isPreview ? 'D\u00FCzenle' : '\u00D6nizleme'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary-400 text-surface hover:bg-primary-500 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" style={{ color: 'var(--color-primary-400)' }} />
          <span className="ml-3 text-text-muted">Makale y\u00FCkleniyor...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/30 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0" style={{ color: '#ef4444' }} />
          <div>
            <p className="font-medium text-error" style={{ color: '#ef4444' }}>Hata</p>
            <p className="text-text-muted text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Content - hide when loading or error */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title Input */}
          <div className="space-y-2">
            <label htmlFor="article-title" className="block text-sm font-medium text-text">
              Ba\u015Fl\u0131k
            </label>
            <input
              id="article-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Makale ba\u015Fl\u0131\u011F\u0131n\u0131 girin..."
              className="w-full px-4 py-3 bg-surface-alt border border-border rounded-xl text-text text-lg font-medium placeholder:text-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200"
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text">
              \u0130\u00E7erik
            </label>
            {isPreview ? (
              <div
                className="border border-border rounded-xl overflow-hidden bg-surface-alt min-h-[300px] px-4 py-3 prose prose-invert prose-zinc max-w-none"
              />
            ) : (
              <TipTapEditor
                key={articleId}
                content={content}
                onChange={setContent}
                placeholder="Makale i\u00E7eri\u011Fini yazmaya ba\u015Flay\u0131n..."
              />
            )}
          </div>
        </div>

        {/* Sidebar Column with Tabs */}
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-1 bg-surface-alt border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('featured-image')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                ${activeTab === 'featured-image'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
                }
              `}
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">G\u00F6rsel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('seo')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                ${activeTab === 'seo'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
                }
              `}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">SEO</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai-assistant')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                ${activeTab === 'ai-assistant'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
                }
              `}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-surface-alt border border-border rounded-xl p-4">
            {/* Featured Image Tab */}
            {activeTab === 'featured-image' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary-400" style={{ color: 'var(--color-primary-400)' }} />
                    <h3 className="font-semibold text-text">\u00D6ne \u00C7\u0131kan G\u00F6rsel</h3>
                  </div>
                  {featuredImage && (
                    <button
                      onClick={handleRemoveImage}
                      className="text-text-muted hover:text-error transition-colors p-1 rounded-lg hover:bg-error/10"
                      aria-label="Remove featured image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {featuredImage ? (
                  <div className="space-y-3">
                    <div className="aspect-video rounded-lg overflow-hidden bg-surface"
                      style={{ backgroundColor: 'var(--color-surface)' }}
                    >
                      <img
                        src={featuredImage.url}
                        alt={featuredImage.altDescription || featuredImage.description || 'Featured image'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <ImageAttribution image={featuredImage} />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowImageSearch(!showImageSearch)}
                    className="w-full py-8 border-2 border-dashed border-border rounded-lg text-text-muted hover:text-text hover:border-primary-400/50 transition-all duration-200 flex flex-col items-center gap-2 cursor-pointer"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-sm font-medium">G\u00F6rsel Se\u00E7</span>
                    <span className="text-xs">Unsplash'tan ara</span>
                  </button>
                )}

                {/* Image Search Panel */}
                {showImageSearch && !featuredImage && (
                  <div className="pt-4 border-t border-border"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-text">G\u00F6rsel Ara</span>
                      <button
                        onClick={() => setShowImageSearch(false)}
                        className="text-text-muted hover:text-text transition-colors p-1"
                        aria-label="Close image search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <ImageSearch
                      onSelect={handleSelectImage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* SEO Tab (US-006) */}
            {activeTab === 'seo' && (
              <SEOPanel
                title={title}
                content={content}
                metaTitle={metaTitle}
                metaDescription={metaDescription}
                slug={slug}
                onMetaTitleChange={setMetaTitle}
                onMetaDescriptionChange={setMetaDescription}
                onSlugChange={setSlug}
              />
            )}

            {/* AI Assistant Tab */}
            {activeTab === 'ai-assistant' && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-accent-400/10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(var(--color-accent-400-rgb, 163, 230, 53), 0.1)' }}
                >
                  <Sparkles className="w-5 h-5 text-accent-400" style={{ color: 'var(--color-accent-400)' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text">AI Asistan</h3>
                  <p className="text-text-muted text-sm mt-1">
                    Yapay zeka ile i\u00E7erik \u00F6nerileri al\u0131n.
                  </p>

                  {/* AI Action Buttons */}
                  <div className="flex flex-col gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleSuggestTitle}
                      disabled={isSuggestingTitle}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-surface text-text hover:text-text hover:bg-surface-elevated transition-all duration-200 cursor-pointer border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                      {isSuggestingTitle ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PenTool className="w-4 h-4" />
                      )}
                      Ba\u015Fl\u0131k \u00D6ner
                    </button>
                    <button
                      type="button"
                      onClick={handleAnalyzeSEO}
                      disabled={isAnalyzingSEO}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-surface text-text hover:text-text hover:bg-surface-elevated transition-all duration-200 cursor-pointer border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                      {isAnalyzingSEO ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      SEO Analizi
                    </button>
                  </div>
                </div>

                {/* Title Suggestions Panel (US-001) */}
                {showTitleSuggestions && titleSuggestions.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-border" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text">Ba\u015Fl\u0131k \u00D6nerileri</span>
                      <button
                        onClick={() => setShowTitleSuggestions(false)}
                        className="text-text-muted hover:text-text transition-colors p-1"
                        aria-label="Close title suggestions"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {titleSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectTitleSuggestion(suggestion)}
                          className="w-full text-left px-3 py-2.5 rounded-lg text-sm bg-surface-alt border border-border text-text hover:border-primary-400/50 hover:bg-surface-elevated transition-all duration-200 cursor-pointer"
                          style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEO Analysis Panel (US-001) */}
                {showSEOAnalysis && seoAnalysis && (
                  <div className="space-y-4 pt-4 border-t border-border" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary-400" style={{ color: 'var(--color-primary-400)' }} />
                        <span className="text-sm font-medium text-text">SEO Analizi</span>
                      </div>
                      <button
                        onClick={() => setShowSEOAnalysis(false)}
                        className="text-text-muted hover:text-text transition-colors p-1"
                        aria-label="Close SEO analysis"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* SEO Score */}
                    <div className="flex items-center justify-between p-4 bg-surface-alt rounded-xl" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                      <div>
                        <p className="text-xs text-text-muted">SEO Puan\u0131</p>
                        <p className={`text-2xl font-bold ${getSEOscoreColor(seoAnalysis.score)}`}>
                          {seoAnalysis.score}/100
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSEOscoreColor(seoAnalysis.score)}`}>
                        {getSEOScoreLabel(seoAnalysis.score)}
                      </div>
                    </div>

                    {/* SEO Metrics */}
                    {seoAnalysis.metrics && Object.keys(seoAnalysis.metrics).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Metrikler</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(seoAnalysis.metrics).map(([key, value]) => (
                            <div
                              key={key}
                              className="px-3 py-2 bg-surface-alt rounded-lg text-xs"
                              style={{ backgroundColor: 'var(--color-surface-alt)' }}
                            >
                              <p className="text-text-muted">{key}</p>
                              <p className="font-semibold text-text">{String(value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SEO Suggestions */}
                    {seoAnalysis.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">\u00D6neriler</p>
                        <div className="space-y-2">
                          {seoAnalysis.suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 p-3 bg-surface-alt rounded-lg"
                              style={{ backgroundColor: 'var(--color-surface-alt)' }}
                            >
                              <CheckCircle2 className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary-400)' }} />
                              <p className="text-sm text-text">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
