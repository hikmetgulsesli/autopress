import OpenAI from 'openai';

// Types
export type ContentType = 'blog' | 'listicle' | 'howto' | 'faq';
export type Language = 'TR' | 'EN' | 'DE' | 'FR' | 'ES' | 'AR';

export interface ContentGenerationOptions {
  topic: string;
  contentType: ContentType;
  language: Language;
  wordCount: number;
  keywords?: string[];
}

export interface GeneratedContent {
  title: string;
  slug: string;
  excerpt: string;
  metaDescription: string;
  content: string;
  headings: { h1: string; h2: string[]; h3: string[] };
  jsonLd?: object;
}

export interface ContentServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Initialize OpenAI client
const getOpenAIClient = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw {
      code: 'MISSING_API_KEY',
      message: 'OpenAI API key not configured',
    } as ContentServiceError;
  }
  return new OpenAI({ apiKey });
};

// Supported languages with display names
const languageNames: Record<Language, string> = {
  TR: 'Turkish',
  EN: 'English',
  DE: 'German',
  FR: 'French',
  ES: 'Spanish',
  AR: 'Arabic',
};

// Word count validation
const validateWordCount = (wordCount: number): void => {
  const minWords = 800;
  const maxWords = 2000;

  if (wordCount < minWords || wordCount > maxWords) {
    throw {
      code: 'INVALID_WORD_COUNT',
      message: `Word count must be between ${minWords} and ${maxWords} words`,
      details: { requested: wordCount, min: minWords, max: maxWords },
    } as ContentServiceError;
  }
};

// Prompt templates for different content types
const buildPrompt = (
  topic: string,
  contentType: ContentType,
  language: Language,
  wordCount: number,
  keywords?: string[]
): string => {
  const langName = languageNames[language];
  const keywordStr = keywords?.length ? `Keywords: ${keywords.join(', ')}` : '';
  const wordTarget = `Approximately ${wordCount} words`;

  const baseContext = `You are a professional content writer. Write in ${langName}.
${keywordStr}
Target length: ${wordTarget}

IMPORTANT: 
- Use proper heading hierarchy (H1 for title, H2 for main sections, H3 for subsections)
- Generate SEO-friendly meta description (max 160 characters)
- Generate a URL-friendly slug
- Generate an excerpt (max 200 characters)
- Output valid JSON only
`;

  const contentTypePrompts: Record<ContentType, string> = {
    blog: `${baseContext}
Write a comprehensive blog article that:
- Has a compelling introduction
- Covers the topic in depth
- Includes practical insights or analysis
- Has a clear conclusion

Respond with JSON:
{
  "title": "Main title (H1)",
  "slug": "url-friendly-slug",
  "excerpt": "Brief summary (max 200 chars)",
  "metaDescription": "SEO meta description (max 160 chars)",
  "content": "Full article content with Markdown headings",
  "headings": {
    "h1": "Main title",
    "h2": ["H2 section titles"],
    "h3": ["H3 subsection titles"]
  }
}`,

    listicle: `${baseContext}
Write a listicle article that:
- Has a numbered list format
- Each item has substantial content (not just bullet points)
- Items are organized logically

Respond with JSON:
{
  "title": "Main title (H1)",
  "slug": "url-friendly-slug",
  "excerpt": "Brief summary (max 200 chars)",
  "metaDescription": "SEO meta description (max 160 chars)",
  "content": "Full listicle content with Markdown headings",
  "headings": {
    "h1": "Main title",
    "h2": ["H2 section titles"],
    "h3": ["H3 subsection titles"]
  }
}`,

    howto: `${baseContext}
Write a how-to guide that:
- Has clear step-by-step instructions
- Includes prerequisites if needed
- Each step has detailed explanation
- Has troubleshooting/tips section

Respond with JSON:
{
  "title": "Main title (H1)",
  "slug": "url-friendly-slug",
  "excerpt": "Brief summary (max 200 chars)",
  "metaDescription": "SEO meta description (max 160 chars)",
  "content": "Full how-to guide content with Markdown headings",
  "headings": {
    "h1": "Main title",
    "h2": ["H2 section titles"],
    "h3": ["H3 subsection titles"]
  }
}`,

    faq: `${baseContext}
Write an FAQ article that:
- Has common questions and detailed answers
- Questions are realistic and searchable
- Answers provide substantial information

Also generate JSON-LD schema for FAQ.

Respond with JSON:
{
  "title": "Main title (H1)",
  "slug": "url-friendly-slug",
  "excerpt": "Brief summary (max 200 chars)",
  "metaDescription": "SEO meta description (max 160 chars)",
  "content": "Full FAQ content with Markdown headings",
  "headings": {
    "h1": "Main title",
    "h2": ["H2 section titles"],
    "h3": ["H3 subsection titles"]
  },
  "jsonLd": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question", "name": "...", "acceptedAnswer": {"@type": "Answer", "text": "..."}}
    ]
  }
}`,
  };

  return contentTypePrompts[contentType] + `\n\nTopic: ${topic}`;
};

// Parse and validate response
const parseResponse = (response: string): GeneratedContent => {
  try {
    const parsed = JSON.parse(response);
    
    // Validate required fields
    const requiredFields = ['title', 'slug', 'excerpt', 'metaDescription', 'content', 'headings'];
    for (const field of requiredFields) {
      if (!parsed[field]) {
        throw {
          code: 'INVALID_RESPONSE',
          message: `Missing required field: ${field}`,
        } as ContentServiceError;
      }
    }

    return parsed as GeneratedContent;
  } catch (err) {
    if ((err as ContentServiceError).code) {
      throw err;
    }
    throw {
      code: 'PARSE_ERROR',
      message: 'Failed to parse AI response as JSON',
      details: { rawResponse: response.substring(0, 500) },
    } as ContentServiceError;
  }
};

// Main content generation function
export const generateArticle = async (
  options: ContentGenerationOptions
): Promise<GeneratedContent> => {
  const { topic, contentType, language, wordCount, keywords } = options;

  // Validate inputs
  if (!topic || topic.trim().length === 0) {
    throw {
      code: 'INVALID_TOPIC',
      message: 'Topic is required',
    } as ContentServiceError;
  }

  if (!['blog', 'listicle', 'howto', 'faq'].includes(contentType)) {
    throw {
      code: 'INVALID_CONTENT_TYPE',
      message: 'Content type must be one of: blog, listicle, howto, faq',
    } as ContentServiceError;
  }

  if (!['TR', 'EN', 'DE', 'FR', 'ES', 'AR'].includes(language)) {
    throw {
      code: 'INVALID_LANGUAGE',
      message: 'Language must be one of: TR, EN, DE, FR, ES, AR',
    } as ContentServiceError;
  }

  validateWordCount(wordCount);

  let openai: OpenAI;
  try {
    openai = getOpenAIClient();
  } catch (err) {
    throw err;
  }

  const prompt = buildPrompt(topic, contentType, language, wordCount, keywords);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional content writer. Always respond with valid JSON only, no markdown formatting around it.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw {
        code: 'EMPTY_RESPONSE',
        message: 'OpenAI returned empty content',
      } as ContentServiceError;
    }

    return parseResponse(content);
  } catch (err) {
    if ((err as ContentServiceError).code) {
      throw err;
    }

    // Handle OpenAI API errors
    const error = err as { status?: number; message?: string };
    if (error.status === 401) {
      throw {
        code: 'AUTH_ERROR',
        message: 'Invalid OpenAI API key',
      } as ContentServiceError;
    }

    if (error.status === 429) {
      throw {
        code: 'RATE_LIMITED',
        message: 'OpenAI API rate limit exceeded',
      } as ContentServiceError;
    }

    throw {
      code: 'AI_ERROR',
      message: `Failed to generate content: ${error.message || 'Unknown error'}`,
    } as ContentServiceError;
  }
};
