import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { generateArticle, ContentGenerationOptions } from '../services/content.service';
import { logger } from '../utils/logger';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// ============================================================================
// Schemas
// ============================================================================

const contentTypeEnum = z.enum(['blog', 'listicle', 'howto', 'faq']);
const languageEnum = z.enum(['TR', 'EN', 'DE', 'FR', 'ES', 'AR']);

const generateContentSchema = z.object({
  topic: z.string().min(1, 'Konu gerekli').max(500, 'Konu çok uzun'),
  contentType: contentTypeEnum,
  language: languageEnum.default('TR'),
  wordCount: z.number().int().min(800).max(2000).default(1000),
  keywords: z.array(z.string().min(1).max(100)).optional(),
});

const suggestTitleSchema = z.object({
  topic: z.string().min(1, 'Konu gerekli').max(500, 'Konu çok uzun'),
  contentType: contentTypeEnum.default('blog'),
  language: languageEnum.default('TR'),
  count: z.number().int().min(1).max(10).default(5),
});

const analyzeSeoSchema = z.object({
  title: z.string().min(1, 'Başlık gerekli').max(500, 'Başlık çok uzun'),
  content: z.string().min(1, 'İçerik gerekli'),
  keywords: z.array(z.string().min(1)).optional(),
  language: languageEnum.default('TR'),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/content/generate
 * Generate AI content for an article
 */
router.post('/generate', validateBody(generateContentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const options: ContentGenerationOptions = {
      topic: req.body.topic,
      contentType: req.body.contentType,
      language: req.body.language,
      wordCount: req.body.wordCount,
      keywords: req.body.keywords,
    };

    logger.info('Generating content', { 
      userId: req.user!.id, 
      topic: options.topic,
      contentType: options.contentType,
      language: options.language,
    });

    const generated = await generateArticle(options);

    logger.info('Content generated successfully', { 
      userId: req.user!.id, 
      title: generated.title,
      slug: generated.slug,
    });

    res.status(200).json({
      success: true,
      data: generated,
    });
  } catch (err: any) {
    logger.error('Content generation failed', { 
      userId: req.user!.id, 
      error: err.message,
      code: err.code,
    });

    // Handle specific error codes from content service
    if (err.code === 'MISSING_API_KEY') {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'AI servisi yapılandırılmamış',
        },
      });
    }

    if (err.code === 'RATE_LIMITED') {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'AI servisi limit aşımı, lütfen daha sonra tekrar deneyin',
        },
      });
    }

    if (err.code === 'AUTH_ERROR') {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'AI servisi kimlik doğrulama hatası',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: err.code || 'GENERATION_ERROR',
        message: err.message || 'İçerik oluşturulurken bir hata oluştu',
      },
    });
  }
});

/**
 * POST /api/content/suggest-title
 * Get AI-generated title suggestions
 */
router.post('/suggest-title', validateBody(suggestTitleSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { topic, contentType, language, count } = req.body;

    logger.info('Generating title suggestions', { 
      userId: req.user!.id, 
      topic,
      contentType,
      language,
      count,
    });

    // Generate content once to get title suggestions
    // In a real implementation, you might want a separate service method
    const options: ContentGenerationOptions = {
      topic,
      contentType,
      language,
      wordCount: 1000,
    };

    const generated = await generateArticle(options);

    // Generate additional variations based on the main title
    const titles = [generated.title];
    
    // Add variations (in production, these could come from AI)
    const variations = generateTitleVariations(generated.title, contentType, count - 1);
    titles.push(...variations);

    logger.info('Title suggestions generated', { 
      userId: req.user!.id, 
      count: titles.length,
    });

    res.status(200).json({
      success: true,
      data: {
        topic,
        suggestions: titles.slice(0, count).map((title, index) => ({
          id: index + 1,
          title,
          slug: generateSlug(title),
        })),
      },
    });
  } catch (err: any) {
    logger.error('Title suggestion failed', { 
      userId: req.user!.id, 
      error: err.message,
      code: err.code,
    });

    if (err.code === 'MISSING_API_KEY') {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'AI servisi yapılandırılmamış',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: err.code || 'SUGGESTION_ERROR',
        message: err.message || 'Başlık önerileri oluşturulurken bir hata oluştu',
      },
    });
  }
});

/**
 * POST /api/content/analyze-seo
 * Analyze SEO metrics for content
 */
router.post('/analyze-seo', validateBody(analyzeSeoSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, keywords = [], language } = req.body;

    logger.info('Analyzing SEO', { 
      userId: req.user!.id, 
      title,
      language,
      contentLength: content.length,
    });

    // Perform SEO analysis
    const analysis = performSeoAnalysis(title, content, keywords);

    logger.info('SEO analysis completed', { 
      userId: req.user!.id, 
      score: analysis.score,
    });

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (err: any) {
    logger.error('SEO analysis failed', { 
      userId: req.user!.id, 
      error: err.message,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: err.message || 'SEO analizi yapılırken bir hata oluştu',
      },
    });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate title variations based on content type
 */
function generateTitleVariations(baseTitle: string, contentType: string, count: number): string[] {
  const variations: string[] = [];
  
  const prefixes: Record<string, string[]> = {
    blog: ['Kapsamlı Rehber:', 'Uzman Görüşü:', 'Detaylı Analiz:', 'En İyi', '2024'],
    listicle: ['Top 10', 'En İyi 5', 'Mutlaka Bilmeniz Gereken', 'İşte En Popüler', 'Sıralama:'],
    howto: ['Nasıl Yapılır?', 'Adım Adım:', 'Kolay Yöntem:', 'Pratik Rehber:', 'İpuçları:'],
    faq: ['Sıkça Sorulan Sorular:', 'Merak Edilenler:', 'Temel Bilgiler:', 'Hakkında Bilmeniz Gerekenler:', 'Rehberi:'],
  };

  const typePrefixes = prefixes[contentType] || prefixes.blog;
  
  for (let i = 0; i < count && i < typePrefixes.length; i++) {
    const prefix = typePrefixes[i];
    // Remove common words to create variation
    const cleanTitle = baseTitle.replace(/^(Kapsamlı Rehber|Detaylı Analiz|En İyi)\s*/i, '');
    variations.push(`${prefix} ${cleanTitle}`);
  }

  return variations;
}

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Perform SEO analysis on content
 */
function performSeoAnalysis(title: string, content: string, keywords: string[]) {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const titleLength = title.length;
  
  // Calculate reading time (average 200 words per minute)
  const readingTime = Math.ceil(wordCount / 200);
  
  // Check title length (optimal: 50-60 chars)
  const titleScore = titleLength >= 30 && titleLength <= 60 ? 100 : 
    titleLength < 30 ? 70 : titleLength > 80 ? 50 : 80;
  
  // Check content length (optimal: 800+ words)
  const contentScore = wordCount >= 800 ? 100 : 
    wordCount >= 500 ? 80 : wordCount >= 300 ? 60 : 40;
  
  // Check keyword density
  const keywordScores = keywords.map(keyword => {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = (content.match(regex) || []).length;
    const density = wordCount > 0 ? (matches / wordCount) * 100 : 0;
    
    // Optimal keyword density: 1-2%
    const densityScore = density >= 0.5 && density <= 2.5 ? 100 :
      density < 0.5 ? 60 : 70;
    
    return {
      keyword,
      count: matches,
      density: parseFloat(density.toFixed(2)),
      score: densityScore,
    };
  });
  
  // Check for headings (H1, H2 patterns)
  const hasH1 = /^#\s/m.test(content);
  const h2Count = (content.match(/^##\s/mg) || []).length;
  const h3Count = (content.match(/^###\s/mg) || []).length;
  
  const structureScore = hasH1 && h2Count >= 2 ? 100 :
    hasH1 && h2Count >= 1 ? 80 :
    h2Count >= 2 ? 70 : 50;
  
  // Check for images
  const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const imageScore = imageCount >= 2 ? 100 : imageCount >= 1 ? 80 : 60;
  
  // Check for internal/external links
  const linkCount = (content.match(/\[.*?\]\(https?:\/\/.*?\)/g) || []).length;
  const linkScore = linkCount >= 2 ? 100 : linkCount >= 1 ? 80 : 60;
  
  // Calculate overall score
  const scores = [
    titleScore * 0.2,
    contentScore * 0.25,
    structureScore * 0.2,
    imageScore * 0.15,
    linkScore * 0.1,
    ...(keywordScores.length > 0 ? [keywordScores.reduce((a, k) => a + k.score, 0) / keywordScores.length * 0.1] : [80 * 0.1]),
  ];
  
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0));
  
  // Generate suggestions
  const suggestions: string[] = [];
  
  if (titleLength < 30) {
    suggestions.push('Başlık çok kısa, daha açıklayıcı bir başlık kullanın');
  } else if (titleLength > 60) {
    suggestions.push('Başlık çok uzun, 50-60 karakter arasında tutun');
  }
  
  if (wordCount < 800) {
    suggestions.push('İçerik 800 kelimeden kısa, daha kapsamlı içerik oluşturun');
  }
  
  if (!hasH1) {
    suggestions.push('H1 başlığı ekleyin');
  }
  
  if (h2Count < 2) {
    suggestions.push('En az 2-3 H2 alt başlığı ekleyin');
  }
  
  if (imageCount < 1) {
    suggestions.push('Görsel ekleyerek içeriği zenginleştirin');
  }
  
  if (linkCount < 1) {
    suggestions.push('Dış bağlantılar ekleyin');
  }
  
  keywordScores.forEach(k => {
    if (k.density < 0.5) {
      suggestions.push(`"${k.keyword}" anahtar kelimesini daha sık kullanın`);
    } else if (k.density > 2.5) {
      suggestions.push(`"${k.keyword}" anahtar kelimesini daha az kullanın (aşırı optimizasyon)`);
    }
  });
  
  return {
    score: overallScore,
    grade: overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F',
    metrics: {
      wordCount,
      titleLength,
      readingTime,
      headingCount: {
        h1: hasH1 ? 1 : 0,
        h2: h2Count,
        h3: h3Count,
      },
      imageCount,
      linkCount,
    },
    scores: {
      title: titleScore,
      content: contentScore,
      structure: structureScore,
      images: imageScore,
      links: linkScore,
      keywords: keywordScores.length > 0 ? 
        Math.round(keywordScores.reduce((a, k) => a + k.score, 0) / keywordScores.length) : null,
    },
    keywordAnalysis: keywordScores,
    suggestions: suggestions.length > 0 ? suggestions : ['İçerik SEO açısından iyi durumda!'],
  };
}

export default router;
