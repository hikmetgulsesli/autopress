import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { query } from '../db/connection';

// Types
export interface LinkSuggestion {
  id?: number;
  sourceArticleId: number;
  targetArticleId: number;
  targetTitle: string;
  targetSlug: string;
  targetUrl: string;
  anchorText: string;
  context: string;
  relevanceScore: number;
  position: number;
  applied: boolean;
}

export interface InternalLink {
  id: number;
  sourceArticleId: number;
  targetArticleId: number;
  anchorText: string;
  createdAt: Date;
}

export interface ArticleForLinking {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  siteId?: number;
  publishedUrl?: string;
}

export interface KeywordMatch {
  keyword: string;
  frequency: number;
  positions: number[];
}

export interface InternalLinksServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'and', 'but', 'or', 'yet', 'so', 'if',
  'because', 'although', 'though', 'while', 'where', 'when', 'that',
  'which', 'who', 'whom', 'whose', 'what', 'this', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine',
  'yours', 'hers', 'ours', 'theirs', 'myself', 'yourself', 'himself',
  'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
  'bir', 've', 'ile', 'için', 'bu', 'şu', 'o', 'de', 'da', 'den',
  'dan', 'e', 'a', 'ye', 'ya', 'te', 'ta', 'deki', 'daki', 'ki',
  'mi', 'mı', 'mu', 'mü', 'ise', 'ya da', 'çünkü', 'için', 'gibi',
  'kadar', 'her', 'bazı', 'tüm', 'hiç', 'çok', 'az', 'daha', 'en',
  'şey', 'kişi', 'zaman', 'yer', 'yıl', 'gün', 'iş', 'taraf',
]);

// Extract keywords from text content
export const extractKeywords = (text: string, maxKeywords: number = 20): string[] => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Clean and normalize text
  const cleanText = text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Extract word frequencies
  const wordFreq = new Map<string, number>();
  const words = cleanText.split(' ').filter(w => w.length > 2);

  // Single words
  for (const word of words) {
    if (!STOP_WORDS.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  // Extract 2-word phrases (bigrams)
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
      wordFreq.set(phrase, (wordFreq.get(phrase) || 0) + 1);
    }
  }

  // Extract 3-word phrases (trigrams) - only if both outer words are not stop words
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 2])) {
      wordFreq.set(phrase, (wordFreq.get(phrase) || 0) + 1);
    }
  }

  // Sort by frequency and return top keywords
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
};

// Calculate relevance score between source and target article
const calculateRelevanceScore = (
  sourceKeywords: string[],
  targetTitle: string,
  targetExcerpt: string
): number => {
  const targetText = `${targetTitle} ${targetExcerpt || ''}`.toLowerCase();
  let score = 0;
  let matchCount = 0;

  for (const keyword of sourceKeywords) {
    const keywordLower = keyword.toLowerCase();
    if (targetText.includes(keywordLower)) {
      // Title matches are worth more
      if (targetTitle.toLowerCase().includes(keywordLower)) {
        score += keyword.split(' ').length * 3; // Multi-word phrases score higher
      } else {
        score += keyword.split(' ').length;
      }
      matchCount++;
    }
  }

  // Normalize score based on keyword coverage
  const coverageBonus = matchCount / sourceKeywords.length;
  score = score * (1 + coverageBonus);

  return Math.min(Math.round(score * 10) / 10, 100);
};

// Find link opportunities in HTML content using Cheerio
const findLinkOpportunities = (
  htmlContent: string,
  targetTitle: string,
  targetKeywords: string[],
  existingLinks: Set<string>
): Array<{ anchorText: string; context: string; position: number }> => {
  const $ = cheerio.load(htmlContent);
  const opportunities: Array<{ anchorText: string; context: string; position: number }> = [];
  let position = 0;

  // Remove existing links to avoid nested links
  $('a').each((_, elem) => {
    const href = $(elem).attr('href') || '';
    existingLinks.add(href.toLowerCase());
  });

  // Walk through text nodes
  const walkNodes = (element: cheerio.Cheerio<AnyNode>, depth: number = 0): void => {
    element.contents().each((_idx: number, node: AnyNode) => {
      if (node.type === 'text') {
        const text = $(node).text();
        position += text.length;

        // Check for target keywords in text
        for (const keyword of targetKeywords) {
          const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          let match;

          while ((match = regex.exec(text)) !== null) {
            const start = Math.max(0, match.index - 50);
            const end = Math.min(text.length, match.index + keyword.length + 50);
            const context = text.substring(start, end).trim();

            // Skip if already linked
            const parent = $(node).parent();
            if (parent.is('a')) {
              continue;
            }

            // Check if this keyword is part of an existing link
            const isAlreadyLinked = Array.from(existingLinks).some(link =>
              link.includes(keyword.toLowerCase().replace(/\s+/g, '-'))
            );

            if (!isAlreadyLinked) {
              opportunities.push({
                anchorText: match[0],
                context: `...${context}...`,
                position: position - text.length + match.index,
              });
            }
          }
        }
      } else if (node.type === 'tag' && !['a', 'script', 'style', 'code', 'pre'].includes(node.tagName)) {
        walkNodes($(node), depth + 1);
      }
    });
  };

  walkNodes($('body').length ? $('body') : $.root());

  // Remove duplicates and limit results
  const seen = new Set<string>();
  return opportunities.filter(opp => {
    const key = `${opp.anchorText.toLowerCase()}_${Math.floor(opp.position / 100)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
};

// Get all published articles for linking
const getPublishedArticles = async (excludeArticleId?: number, siteId?: number): Promise<ArticleForLinking[]> => {
  let sql = `
    SELECT id, title, slug, content, excerpt, site_id, published_url
    FROM articles
    WHERE status = 'published'
  `;
  const params: (number | undefined)[] = [];

  if (excludeArticleId) {
    sql += ` AND id != $${params.length + 1}`;
    params.push(excludeArticleId);
  }

  if (siteId) {
    sql += ` AND site_id = $${params.length + 1}`;
    params.push(siteId);
  }

  sql += ` ORDER BY published_at DESC NULLS LAST LIMIT 100`;

  const result = await query(sql, params);

  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    siteId: row.site_id,
    publishedUrl: row.published_url,
  }));
};

// Get existing internal links for an article
const getExistingLinks = async (articleId: number): Promise<InternalLink[]> => {
  const result = await query(
    `SELECT id, source_article_id, target_article_id, anchor_text, created_at
     FROM internal_links
     WHERE source_article_id = $1`,
    [articleId]
  );

  return result.rows.map(row => ({
    id: row.id,
    sourceArticleId: row.source_article_id,
    targetArticleId: row.target_article_id,
    anchorText: row.anchor_text,
    createdAt: new Date(row.created_at),
  }));
};

// Get article by ID
const getArticleById = async (articleId: number): Promise<ArticleForLinking | null> => {
  const result = await query(
    `SELECT id, title, slug, content, excerpt, site_id, published_url
     FROM articles
     WHERE id = $1`,
    [articleId]
  );

  if (!result.rows[0]) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    siteId: row.site_id,
    publishedUrl: row.published_url,
  };
};

// Generate link suggestions for an article
export const generateLinkSuggestions = async (
  articleId: number,
  maxSuggestions: number = 10
): Promise<LinkSuggestion[]> => {
  // Get source article
  const sourceArticle = await getArticleById(articleId);
  if (!sourceArticle) {
    throw {
      code: 'ARTICLE_NOT_FOUND',
      message: `Article with id ${articleId} not found`,
    } as InternalLinksServiceError;
  }

  // Extract keywords from source article
  const sourceKeywords = extractKeywords(
    `${sourceArticle.title} ${sourceArticle.content}`,
    30
  );

  // Get existing links to avoid duplicates
  const existingLinks = await getExistingLinks(articleId);
  const existingTargetIds = new Set(existingLinks.map(link => link.targetArticleId));
  const existingHrefs = new Set<string>();

  // Get target articles
  const targetArticles = await getPublishedArticles(articleId, sourceArticle.siteId);

  if (targetArticles.length === 0) {
    return [];
  }

  const suggestions: LinkSuggestion[] = [];

  for (const target of targetArticles) {
    // Skip if already linked
    if (existingTargetIds.has(target.id)) {
      continue;
    }

    // Calculate relevance score
    const relevanceScore = calculateRelevanceScore(
      sourceKeywords,
      target.title,
      target.excerpt || ''
    );

    // Skip low relevance matches
    if (relevanceScore < 5) {
      continue;
    }

    // Extract keywords from target for matching
    const targetKeywords = extractKeywords(
      `${target.title} ${target.excerpt || ''}`,
      10
    );

    // Find link opportunities in source content
    const opportunities = findLinkOpportunities(
      sourceArticle.content,
      target.title,
      targetKeywords,
      existingHrefs
    );

    if (opportunities.length > 0) {
      // Use the best opportunity
      const bestOpportunity = opportunities[0];

      suggestions.push({
        sourceArticleId: articleId,
        targetArticleId: target.id,
        targetTitle: target.title,
        targetSlug: target.slug || '',
        targetUrl: target.publishedUrl || `/${target.slug || target.id}`,
        anchorText: bestOpportunity.anchorText,
        context: bestOpportunity.context,
        relevanceScore,
        position: bestOpportunity.position,
        applied: false,
      });

      if (suggestions.length >= maxSuggestions) {
        break;
      }
    }
  }

  // Sort by relevance score
  return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
};

// Apply a link suggestion to article content
export const applyLinkSuggestion = async (
  articleId: number,
  suggestion: LinkSuggestion
): Promise<{ success: boolean; updatedContent?: string; error?: string }> => {
  try {
    // Get source article
    const sourceArticle = await getArticleById(articleId);
    if (!sourceArticle) {
      return { success: false, error: 'Source article not found' };
    }

    // Get target article for URL
    const targetArticle = await getArticleById(suggestion.targetArticleId);
    if (!targetArticle) {
      return { success: false, error: 'Target article not found' };
    }

    const targetUrl = targetArticle.publishedUrl || `/${targetArticle.slug || targetArticle.id}`;

    // Parse content with Cheerio
    const $ = cheerio.load(sourceArticle.content);

    // Find and replace the first occurrence of anchor text
    let replaced = false;
    const anchorText = suggestion.anchorText;

    $('body, :not(a)').contents().each((_, node) => {
      if (replaced) return false;

      if (node.type === 'text') {
        const text = $(node).text();
        const index = text.indexOf(anchorText);

        if (index !== -1) {
          const before = text.substring(0, index);
          const after = text.substring(index + anchorText.length);

          const linkHtml = `<a href="${targetUrl}" title="${targetArticle.title}">${anchorText}</a>`;
          $(node).replaceWith(`${before}${linkHtml}${after}`);
          replaced = true;
        }
      }
    });

    if (!replaced) {
      return { success: false, error: 'Could not find anchor text in content' };
    }

    const updatedContent = $.html();

    // Update article content in database
    await query(
      `UPDATE articles SET content = $1, updated_at = NOW() WHERE id = $2`,
      [updatedContent, articleId]
    );

    // Save internal link record
    await query(
      `INSERT INTO internal_links (source_article_id, target_article_id, anchor_text, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (source_article_id, target_article_id) DO UPDATE SET
       anchor_text = EXCLUDED.anchor_text, created_at = NOW()`,
      [articleId, suggestion.targetArticleId, anchorText]
    );

    return { success: true, updatedContent };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
};

// Remove an internal link
export const removeInternalLink = async (
  sourceArticleId: number,
  targetArticleId: number
): Promise<boolean> => {
  try {
    // Remove from database
    await query(
      `DELETE FROM internal_links WHERE source_article_id = $1 AND target_article_id = $2`,
      [sourceArticleId, targetArticleId]
    );

    // Get source article content
    const sourceArticle = await getArticleById(sourceArticleId);
    if (!sourceArticle) return false;

    // Remove links from content using Cheerio
    const $ = cheerio.load(sourceArticle.content);

    $('a').each((_, elem) => {
      const href = $(elem).attr('href') || '';
      // Check if this link points to the target article
      if (href.includes(`/${sourceArticle.slug}`) || href.includes(`/${targetArticleId}`)) {
        const text = $(elem).text();
        $(elem).replaceWith(text);
      }
    });

    const updatedContent = $.html();

    // Update article content
    await query(
      `UPDATE articles SET content = $1, updated_at = NOW() WHERE id = $2`,
      [updatedContent, sourceArticleId]
    );

    return true;
  } catch (err) {
    console.error('Failed to remove internal link:', err);
    return false;
  }
};

// Get all internal links for an article
export const getArticleInternalLinks = async (
  articleId: number
): Promise<Array<InternalLink & { targetTitle: string; targetUrl: string }>> => {
  const result = await query(
    `SELECT il.*, a.title as target_title, a.published_url, a.slug
     FROM internal_links il
     JOIN articles a ON il.target_article_id = a.id
     WHERE il.source_article_id = $1`,
    [articleId]
  );

  return result.rows.map(row => ({
    id: row.id,
    sourceArticleId: row.source_article_id,
    targetArticleId: row.target_article_id,
    anchorText: row.anchor_text,
    createdAt: new Date(row.created_at),
    targetTitle: row.target_title,
    targetUrl: row.published_url || `/${row.slug || row.target_article_id}`,
  }));
};

// Auto-link articles in bulk (for new articles)
export const autoLinkArticle = async (
  articleId: number,
  maxLinks: number = 5
): Promise<{ inserted: number; suggestions: LinkSuggestion[] }> => {
  const suggestions = await generateLinkSuggestions(articleId, maxLinks);
  let inserted = 0;

  // Filter high-quality suggestions
  const highQualitySuggestions = suggestions.filter(s => s.relevanceScore >= 15);

  for (const suggestion of highQualitySuggestions.slice(0, maxLinks)) {
    const result = await applyLinkSuggestion(articleId, suggestion);
    if (result.success) {
      inserted++;
    }
  }

  return { inserted, suggestions };
};

// Get link statistics for a site
export const getLinkStatistics = async (siteId?: number): Promise<{
  totalLinks: number;
  uniqueSourceArticles: number;
  uniqueTargetArticles: number;
  averageLinksPerArticle: number;
}> => {
  let sql = `
    SELECT 
      COUNT(*) as total_links,
      COUNT(DISTINCT source_article_id) as unique_sources,
      COUNT(DISTINCT target_article_id) as unique_targets
    FROM internal_links il
    JOIN articles a ON il.source_article_id = a.id
  `;
  const params: (number | undefined)[] = [];

  if (siteId) {
    sql += ` WHERE a.site_id = $1`;
    params.push(siteId);
  }

  const result = await query(sql, params);
  const row = result.rows[0];

  const totalArticles = await query(
    `SELECT COUNT(*) as count FROM articles WHERE status = 'published' ${siteId ? 'AND site_id = $1' : ''}`,
    siteId ? [siteId] : []
  );

  const articleCount = parseInt(totalArticles.rows[0].count) || 1;

  return {
    totalLinks: parseInt(row.total_links) || 0,
    uniqueSourceArticles: parseInt(row.unique_sources) || 0,
    uniqueTargetArticles: parseInt(row.unique_targets) || 0,
    averageLinksPerArticle: Math.round((parseInt(row.total_links) || 0) / articleCount * 10) / 10,
  };
};

// Find orphaned articles (articles with no incoming internal links)
export const findOrphanedArticles = async (siteId?: number): Promise<ArticleForLinking[]> => {
  let sql = `
    SELECT a.id, a.title, a.slug, a.content, a.excerpt, a.site_id, a.published_url
    FROM articles a
    LEFT JOIN internal_links il ON a.id = il.target_article_id
    WHERE a.status = 'published' AND il.id IS NULL
  `;
  const params: (number | undefined)[] = [];

  if (siteId) {
    sql += ` AND a.site_id = $1`;
    params.push(siteId);
  }

  sql += ` ORDER BY a.created_at DESC LIMIT 50`;

  const result = await query(sql, params);

  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    siteId: row.site_id,
    publishedUrl: row.published_url,
  }));
};
