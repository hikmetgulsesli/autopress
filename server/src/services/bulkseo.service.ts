import { query } from '../db/connection';

export interface BulkJob {
  id: number;
  job_type: 'seo_analysis' | 'link_checker' | 'internal_links';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_items: number;
  processed_items: number;
  failed_items: number;
  filters?: Record<string, unknown>;
  results?: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BrokenLink {
  id: number;
  article_id: number;
  url: string;
  link_type: 'internal' | 'external';
  status_code?: number;
  error_message?: string;
  anchor_text?: string;
  is_broken: boolean;
  last_checked: string;
  created_at: string;
}

export interface LinkSuggestion {
  id: number;
  source_article_id: number;
  target_article_id: number;
  suggested_anchor_text?: string;
  relevance_score: number;
  context_snippet?: string;
  is_applied: boolean;
  created_at: string;
}

export interface SEOAnalysisResult {
  article_id: number;
  title: string;
  slug: string;
  seo_score: number;
  word_count: number;
  meta_title?: string;
  meta_description?: string;
  issues: SEOIssue[];
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
}

export interface BulkAnalysisFilters {
  site_id?: number;
  status?: string;
  language?: string;
  min_seo_score?: number;
  max_seo_score?: number;
}

// Create a new bulk job
export const createBulkJob = async (
  jobType: BulkJob['job_type'],
  filters?: BulkAnalysisFilters
): Promise<BulkJob> => {
  const result = await query(
    `INSERT INTO bulk_seo_jobs (job_type, status, filters) 
     VALUES ($1, $2, $3) RETURNING *`,
    [jobType, 'pending', filters ? JSON.stringify(filters) : null]
  );
  return result.rows[0];
};

// Get job by ID
export const getBulkJob = async (id: number): Promise<BulkJob | null> => {
  const result = await query('SELECT * FROM bulk_seo_jobs WHERE id = $1', [id]);
  return result.rows[0] || null;
};

// Update job progress
export const updateJobProgress = async (
  id: number,
  processed: number,
  failed: number
): Promise<void> => {
  await query(
    `UPDATE bulk_seo_jobs 
     SET processed_items = $1, failed_items = $2, updated_at = NOW() 
     WHERE id = $3`,
    [processed, failed, id]
  );
};

// Mark job as running
export const startJob = async (id: number, totalItems: number): Promise<void> => {
  await query(
    `UPDATE bulk_seo_jobs 
     SET status = 'running', total_items = $1, started_at = NOW(), updated_at = NOW() 
     WHERE id = $2`,
    [totalItems, id]
  );
};

// Mark job as completed
export const completeJob = async (
  id: number,
  results: Record<string, unknown>
): Promise<void> => {
  await query(
    `UPDATE bulk_seo_jobs 
     SET status = 'completed', results = $1, completed_at = NOW(), updated_at = NOW() 
     WHERE id = $2`,
    [JSON.stringify(results), id]
  );
};

// Mark job as failed
export const failJob = async (id: number, errorMessage: string): Promise<void> => {
  await query(
    `UPDATE bulk_seo_jobs 
     SET status = 'failed', error_message = $1, completed_at = NOW(), updated_at = NOW() 
     WHERE id = $2`,
    [errorMessage, id]
  );
};

// Get all jobs with pagination
export const getBulkJobs = async (
  page: number = 1,
  limit: number = 20
): Promise<{ jobs: BulkJob[]; total: number }> => {
  const offset = (page - 1) * limit;
  
  const countResult = await query('SELECT COUNT(*) FROM bulk_seo_jobs');
  const total = parseInt(countResult.rows[0].count);
  
  const result = await query(
    `SELECT * FROM bulk_seo_jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  return { jobs: result.rows, total };
};

// Get articles for bulk analysis
export const getArticlesForAnalysis = async (
  filters?: BulkAnalysisFilters
): Promise<Array<{ id: number; title: string; slug: string; content: string; meta_title?: string; meta_description?: string; seo_score: number; word_count: number }>> => {
  let whereClause = 'WHERE 1=1';
  const params: (number | string)[] = [];
  let idx = 1;

  if (filters?.site_id) {
    whereClause += ` AND site_id = $${idx++}`;
    params.push(filters.site_id);
  }
  if (filters?.status) {
    whereClause += ` AND status = $${idx++}`;
    params.push(filters.status);
  }
  if (filters?.language) {
    whereClause += ` AND language = $${idx++}`;
    params.push(filters.language);
  }
  if (filters?.min_seo_score !== undefined) {
    whereClause += ` AND seo_score >= $${idx++}`;
    params.push(filters.min_seo_score);
  }
  if (filters?.max_seo_score !== undefined) {
    whereClause += ` AND seo_score <= $${idx++}`;
    params.push(filters.max_seo_score);
  }

  const result = await query(
    `SELECT id, title, slug, content, meta_title, meta_description, seo_score, word_count 
     FROM articles ${whereClause} ORDER BY id`,
    params
  );
  
  return result.rows;
};

// Calculate SEO score based on issues
const calculateSEOScore = (issues: SEOIssue[]): number => {
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  
  // Start with perfect score and deduct
  let score = 100;
  score -= errorCount * 15;  // Errors are costly
  score -= warningCount * 5; // Warnings are minor
  
  return Math.max(0, Math.min(100, score));
};

// Update article SEO score in database
export const updateArticleSEOScore = async (
  articleId: number,
  seoScore: number
): Promise<void> => {
  await query(
    'UPDATE articles SET seo_score = $1 WHERE id = $2',
    [seoScore, articleId]
  );
};

// Analyze single article for SEO issues
export const analyzeArticleSEO = async (article: {
  id: number;
  title: string;
  slug: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  seo_score: number;
  word_count: number;
}): Promise<SEOAnalysisResult> => {
  const issues: SEOIssue[] = [];

  // Title checks
  if (!article.title || article.title.length < 10) {
    issues.push({
      type: 'error',
      field: 'title',
      message: 'Title is too short (minimum 10 characters)',
    });
  } else if (article.title.length > 60) {
    issues.push({
      type: 'warning',
      field: 'title',
      message: 'Title is too long (recommended max 60 characters)',
    });
  }

  // Meta description checks
  if (!article.meta_description) {
    issues.push({
      type: 'error',
      field: 'meta_description',
      message: 'Meta description is missing',
    });
  } else if (article.meta_description.length < 50) {
    issues.push({
      type: 'warning',
      field: 'meta_description',
      message: 'Meta description is too short (recommended min 50 characters)',
    });
  } else if (article.meta_description.length > 160) {
    issues.push({
      type: 'warning',
      field: 'meta_description',
      message: 'Meta description is too long (recommended max 160 characters)',
    });
  }

  // Content checks
  if (article.word_count < 300) {
    issues.push({
      type: 'error',
      field: 'content',
      message: 'Content is too short (minimum 300 words recommended)',
    });
  } else if (article.word_count < 800) {
    issues.push({
      type: 'warning',
      field: 'content',
      message: 'Content could be longer (800+ words recommended for SEO)',
    });
  }

  // Slug checks
  if (!article.slug) {
    issues.push({
      type: 'error',
      field: 'slug',
      message: 'URL slug is missing',
    });
  } else if (article.slug.length > 60) {
    issues.push({
      type: 'warning',
      field: 'slug',
      message: 'URL slug is long (keep under 60 characters)',
    });
  }

  // Heading checks (basic)
  const h1Count = (article.content.match(/<h1/gi) || []).length;
  const h2Count = (article.content.match(/<h2/gi) || []).length;
  
  if (h1Count === 0) {
    issues.push({
      type: 'error',
      field: 'headings',
      message: 'No H1 heading found',
    });
  } else if (h1Count > 1) {
    issues.push({
      type: 'warning',
      field: 'headings',
      message: 'Multiple H1 headings found (recommend only one)',
    });
  }

  if (h2Count === 0 && article.word_count > 500) {
    issues.push({
      type: 'warning',
      field: 'headings',
      message: 'No H2 headings found (add subheadings for longer content)',
    });
  }

  // Calculate new SEO score based on analysis
  const calculatedScore = calculateSEOScore(issues);
  
  // Save the calculated SEO score to database
  await updateArticleSEOScore(article.id, calculatedScore);

  return {
    article_id: article.id,
    title: article.title,
    slug: article.slug,
    seo_score: calculatedScore,
    word_count: article.word_count,
    meta_title: article.meta_title,
    meta_description: article.meta_description,
    issues,
  };
};

// Extract links from article content
export const extractLinks = (content: string): Array<{ url: string; anchorText: string; type: 'internal' | 'external' }> => {
  const links: Array<{ url: string; anchorText: string; type: 'internal' | 'external' }> = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[1];
    const anchorText = match[2]?.trim() || '';
    
    // Skip anchors and javascript
    if (url.startsWith('#') || url.startsWith('javascript:')) continue;
    
    const type: 'internal' | 'external' = url.startsWith('http') && !url.includes('localhost') 
      ? 'external' 
      : 'internal';
    
    links.push({ url, anchorText, type });
  }

  return links;
};

// Save broken link
export const saveBrokenLink = async (
  articleId: number,
  url: string,
  linkType: 'internal' | 'external',
  anchorText: string,
  statusCode?: number,
  errorMessage?: string
): Promise<void> => {
  await query(
    `INSERT INTO broken_links (article_id, url, link_type, anchor_text, status_code, error_message, is_broken, last_checked)
     VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
     ON CONFLICT (article_id, url) DO UPDATE SET
       status_code = EXCLUDED.status_code,
       error_message = EXCLUDED.error_message,
       is_broken = true,
       last_checked = NOW()`,
    [articleId, url, linkType, anchorText, statusCode, errorMessage]
  );
};

// Clear broken links for article
export const clearBrokenLinks = async (articleId: number): Promise<void> => {
  await query('DELETE FROM broken_links WHERE article_id = $1', [articleId]);
};

// Get broken links with pagination
export const getBrokenLinks = async (
  page: number = 1,
  limit: number = 50,
  filters?: { link_type?: 'internal' | 'external'; article_id?: number }
): Promise<{ links: BrokenLink[]; total: number }> => {
  let whereClause = 'WHERE is_broken = true';
  const params: (number | string | boolean)[] = [];
  let idx = 1;

  if (filters?.link_type) {
    whereClause += ` AND link_type = $${idx++}`;
    params.push(filters.link_type);
  }
  if (filters?.article_id) {
    whereClause += ` AND article_id = $${idx++}`;
    params.push(filters.article_id);
  }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const countResult = await query(
    `SELECT COUNT(*) FROM broken_links ${whereClause}`,
    params.slice(0, -2)
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT bl.*, a.title as article_title 
     FROM broken_links bl 
     JOIN articles a ON bl.article_id = a.id 
     ${whereClause} 
     ORDER BY bl.last_checked DESC 
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { links: result.rows, total };
};

// Generate internal link suggestions
export const generateLinkSuggestions = async (siteId?: number): Promise<number> => {
  // Get all articles
  let whereClause = '';
  const params: number[] = [];
  
  if (siteId) {
    whereClause = 'WHERE site_id = $1';
    params.push(siteId);
  }

  const articlesResult = await query(
    `SELECT id, title, content, slug FROM articles ${whereClause} ORDER BY id`,
    params
  );
  
  const articles = articlesResult.rows;
  let suggestionsCreated = 0;

  // For each article, find potential link targets
  for (const sourceArticle of articles) {
    const sourceWords = sourceArticle.title.toLowerCase().split(/\s+/);
    
    for (const targetArticle of articles) {
      if (sourceArticle.id === targetArticle.id) continue;

      // Check if target article title words appear in source content
      const targetTitleWords = targetArticle.title.toLowerCase().split(/\s+/);
      const matchingWords = targetTitleWords.filter((word: string) => 
        word.length > 3 && sourceArticle.content.toLowerCase().includes(word)
      );

      if (matchingWords.length >= 2) {
        // Find context snippet
        const contentLower = sourceArticle.content.toLowerCase();
        const firstMatchIndex = contentLower.indexOf(matchingWords[0]);
        const contextSnippet = firstMatchIndex >= 0 
          ? sourceArticle.content.substring(Math.max(0, firstMatchIndex - 50), firstMatchIndex + 100)
          : undefined;

        const relevanceScore = Math.min(100, matchingWords.length * 20);

        try {
          await query(
            `INSERT INTO link_suggestions (source_article_id, target_article_id, suggested_anchor_text, relevance_score, context_snippet)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (source_article_id, target_article_id) DO UPDATE SET
               relevance_score = $4,
               context_snippet = $5,
               is_applied = false`,
            [sourceArticle.id, targetArticle.id, targetArticle.title.substring(0, 255), relevanceScore, contextSnippet]
          );
          suggestionsCreated++;
        } catch (err) {
          // Ignore conflicts
        }
      }
    }
  }

  return suggestionsCreated;
};

// Get link suggestions
export const getLinkSuggestions = async (
  articleId?: number,
  page: number = 1,
  limit: number = 50
): Promise<{ suggestions: Array<LinkSuggestion & { source_title: string; target_title: string }>; total: number }> => {
  let whereClause = 'WHERE ls.is_applied = false';
  const params: number[] = [];
  let idx = 1;

  if (articleId) {
    whereClause += ` AND ls.source_article_id = $${idx++}`;
    params.push(articleId);
  }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const countResult = await query(
    `SELECT COUNT(*) FROM link_suggestions ls ${whereClause}`,
    params.slice(0, -2)
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT ls.*, sa.title as source_title, ta.title as target_title 
     FROM link_suggestions ls 
     JOIN articles sa ON ls.source_article_id = sa.id 
     JOIN articles ta ON ls.target_article_id = ta.id 
     ${whereClause} 
     ORDER BY ls.relevance_score DESC 
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { suggestions: result.rows, total };
};

// Apply link suggestion - actually update article content with the link
export const applyLinkSuggestion = async (id: number): Promise<void> => {
  // Get the suggestion details
  const suggestionResult = await query(
    `SELECT ls.*, sa.content as source_content, sa.slug as source_slug, s.domain as site_domain, s.platform
     FROM link_suggestions ls
     JOIN articles sa ON ls.source_article_id = sa.id
     JOIN articles ta ON ls.target_article_id = ta.id
     JOIN sites s ON sa.site_id = s.id
     WHERE ls.id = $1`,
    [id]
  );

  if (suggestionResult.rows.length === 0) {
    throw new Error('Link suggestion not found');
  }

  const suggestion = suggestionResult.rows[0];

  // Build target article URL based on platform
  let targetUrl: string;
  if (suggestion.platform === 'wordpress') {
    targetUrl = `https://${suggestion.site_domain}/${suggestion.suggested_anchor_text?.toLowerCase().replace(/\s+/g, '-') || suggestion.target_article_id}`;
  } else {
    // Blogger uses post ID
    targetUrl = `https://${suggestion.site_domain}/${suggestion.target_article_id}`;
  }

  // Find the anchor text in the content and wrap it with a link
  const anchorText = suggestion.suggested_anchor_text || suggestion.target_article_id.toString();
  const sourceContent = suggestion.source_content;

  // Use regex to find the anchor text and wrap it with link
  // Escape special regex characters in anchor text
  const escapedAnchor = anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const linkRegex = new RegExp(`(${escapedAnchor})`, 'gi');

  const linkHtml = `<a href="${targetUrl}">$1</a>`;

  // Only replace first occurrence to avoid over-linking
  const updatedContent = sourceContent.replace(linkRegex, linkHtml, 1);

  if (updatedContent === sourceContent) {
    throw new Error('Could not find anchor text in article content');
  }

  // Update the article content
  await query(
    `UPDATE articles SET content = $1, updated_at = NOW() WHERE id = $2`,
    [updatedContent, suggestion.source_article_id]
  );

  // Mark the suggestion as applied
  await query(
    `UPDATE link_suggestions SET is_applied = true WHERE id = $1`,
    [id]
  );
};

// Delete old jobs (cleanup)
export const deleteOldJobs = async (days: number = 30): Promise<number> => {
  const result = await query(
    `DELETE FROM bulk_seo_jobs 
     WHERE created_at < NOW() - INTERVAL '${days} days' 
     AND status IN ('completed', 'failed', 'cancelled')
     RETURNING id`
  );
  return result.rowCount || 0;
};
