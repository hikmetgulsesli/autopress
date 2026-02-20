import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateArticle, ContentGenerationOptions } from '../services/content.service';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const generateSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  contentType: z.enum(['blog', 'listicle', 'howto', 'faq'] as const),
  language: z.enum(['TR', 'EN', 'DE', 'FR', 'ES', 'AR'] as const),
  wordCount: z.number().int().min(800).max(2000),
  keywords: z.array(z.string()).optional(),
});

const suggestTitleSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  contentType: z.enum(['blog', 'listicle', 'howto', 'faq'] as const),
  language: z.enum(['TR', 'EN', 'DE', 'FR', 'ES', 'AR'] as const),
  count: z.number().int().min(1).max(10).default(5),
});

const analyzeSeoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  metaDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const validation = generateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const options: ContentGenerationOptions = validation.data;
    const generatedContent = await generateArticle(options);

    res.status(200).json({ data: generatedContent });
  } catch (err: any) {
    if (err.code) {
      const statusMap: Record<string, number> = {
        INVALID_TOPIC: 400,
        INVALID_CONTENT_TYPE: 400,
        INVALID_LANGUAGE: 400,
        INVALID_WORD_COUNT: 400,
        MISSING_API_KEY: 500,
        AUTH_ERROR: 500,
        RATE_LIMITED: 429,
        AI_ERROR: 502,
        PARSE_ERROR: 502,
        INVALID_RESPONSE: 502,
        EMPTY_RESPONSE: 502,
      };
      return res.status(statusMap[err.code] || 500).json({
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to generate content' },
    });
  }
});

router.post('/suggest-title', async (req: AuthRequest, res: Response) => {
  try {
    const validation = suggestTitleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const { topic, contentType, language, count } = validation.data;
    const { default: OpenAI } = await import('openai');
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        error: { code: 'MISSING_API_KEY', message: 'OpenAI API key not configured' },
      });
    }

    const openai = new OpenAI({ apiKey });

    const languageNames: Record<string, string> = {
      TR: 'Turkish', EN: 'English', DE: 'German', FR: 'French', ES: 'Spanish', AR: 'Arabic',
    };

    const contentTypeDescriptions: Record<string, string> = {
      blog: 'a comprehensive blog article',
      listicle: 'a numbered listicle',
      howto: 'a step-by-step how-to guide',
      faq: 'a frequently asked questions article',
    };

    const prompt = `Generate ${count} compelling, SEO-friendly titles for ${contentTypeDescriptions[contentType]} about "${topic}" in ${languageNames[language]}.

Requirements:
- Titles should be engaging and click-worthy
- Include power words where appropriate
- Keep titles between 40-60 characters for optimal SEO
- Each title should be unique and offer a different angle

Respond with JSON only:
{
  "titles": ["Title 1", "Title 2", "Title 3", ...]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional content strategist. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: { code: 'EMPTY_RESPONSE', message: 'AI returned empty content' } });
    }

    const parsed = JSON.parse(content);
    if (!parsed.titles || !Array.isArray(parsed.titles)) {
      return res.status(502).json({ error: { code: 'INVALID_RESPONSE', message: 'Invalid response format from AI' } });
    }

    res.status(200).json({
      data: { titles: parsed.titles.slice(0, count), topic, contentType, language },
    });
  } catch (err: any) {
    if (err.status === 401) {
      return res.status(500).json({ error: { code: 'AUTH_ERROR', message: 'Invalid OpenAI API key' } });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'OpenAI API rate limit exceeded' } });
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to suggest titles' } });
  }
});

router.post('/analyze-seo', async (req: AuthRequest, res: Response) => {
  try {
    const validation = analyzeSeoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const { title, content, metaDescription, keywords = [] } = validation.data;

    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);
    
    const titleLength = title.length;
    const titleScore = titleLength >= 40 && titleLength <= 60 ? 100 : 
                       titleLength >= 30 && titleLength <= 70 ? 80 : 50;
    
    const hasHeadings = /^#{1,6}\s/m.test(content);
    const hasImages = /!\[.*?\]\(.*?\)/.test(content) || /<img/.test(content);
    const hasLinks = /\[.*?\]\(.*?\)/.test(content) || /<a\s/.test(content);
    const paragraphCount = content.split(/\n\n+/).filter(p => p.trim().length > 0).length;
    
    const contentLower = content.toLowerCase();
    const titleLower = title.toLowerCase();
    const keywordAnalysis = keywords.map(keyword => {
      const keywordLower = keyword.toLowerCase();
      const inTitle = titleLower.includes(keywordLower);
      const inContent = contentLower.includes(keywordLower);
      const occurrences = (contentLower.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const density = wordCount > 0 ? (occurrences / wordCount) * 100 : 0;
      
      return {
        keyword,
        inTitle,
        inContent,
        occurrences,
        density: Math.round(density * 100) / 100,
        status: density >= 0.5 && density <= 2.5 ? 'optimal' : density > 2.5 ? 'overused' : 'underused',
      };
    });

    const metaDescLength = metaDescription?.length || 0;
    const metaDescScore = metaDescLength >= 120 && metaDescLength <= 160 ? 100 :
                          metaDescLength >= 100 && metaDescLength <= 170 ? 80 : 
                          metaDescLength > 0 ? 50 : 0;

    let structureScore = 50;
    if (hasHeadings) structureScore += 15;
    if (hasImages) structureScore += 15;
    if (hasLinks) structureScore += 10;
    if (paragraphCount >= 3) structureScore += 10;

    const lengthScore = wordCount >= 800 ? 100 : 
                        wordCount >= 500 ? 80 :
                        wordCount >= 300 ? 60 : 40;

    const overallScore = Math.round((titleScore + metaDescScore + structureScore + lengthScore) / 4);

    const suggestions: string[] = [];
    if (titleLength < 40) suggestions.push('Title is too short. Aim for 40-60 characters.');
    if (titleLength > 60) suggestions.push('Title is too long. Aim for 40-60 characters.');
    if (!metaDescription) suggestions.push('Add a meta description (120-160 characters).');
    if (metaDescLength > 0 && metaDescLength < 120) suggestions.push('Meta description is too short. Aim for 120-160 characters.');
    if (metaDescLength > 160) suggestions.push('Meta description is too long. Aim for 120-160 characters.');
    if (!hasHeadings) suggestions.push('Add headings (H2, H3) to improve content structure.');
    if (!hasImages) suggestions.push('Add images to make content more engaging.');
    if (!hasLinks) suggestions.push('Add internal or external links for better SEO.');
    if (wordCount < 800) suggestions.push('Content is short. Aim for at least 800 words for better rankings.');
    
    keywordAnalysis.forEach(kw => {
      if (kw.status === 'overused') {
        suggestions.push(`Keyword "${kw.keyword}" is overused (${kw.density}%). Reduce usage.`);
      } else if (kw.status === 'underused') {
        suggestions.push(`Keyword "${kw.keyword}" is underused. Consider adding it more often.`);
      }
      if (!kw.inTitle) {
        suggestions.push(`Consider adding "${kw.keyword}" to the title.`);
      }
    });

    res.status(200).json({
      data: {
        scores: { overall: overallScore, title: titleScore, metaDescription: metaDescScore, structure: structureScore, length: lengthScore },
        metrics: { wordCount, readingTime, titleLength, metaDescriptionLength: metaDescLength, hasHeadings, hasImages, hasLinks, paragraphCount },
        keywordAnalysis,
        suggestions,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to analyze SEO' } });
  }
});

export default router;
