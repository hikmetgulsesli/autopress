import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as bulkSeoService from '../services/bulkseo.service';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);

// Get all bulk jobs
router.get('/jobs', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const { jobs, total } = await bulkSeoService.getBulkJobs(page, limit);
    
    res.json({
      data: jobs,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    logger.error('Failed to get bulk jobs:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: err.message } });
  }
});

// Get single job
router.get('/jobs/:id', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await bulkSeoService.getBulkJob(parseInt(jobId as string));
    if (!job) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
    }
    res.json({ data: job });
  } catch (err: any) {
    logger.error('Failed to get bulk job:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: err.message } });
  }
});

// Start bulk SEO analysis
router.post('/analyze', async (req: AuthRequest, res: Response) => {
  try {
    const { site_id, status, language, min_seo_score, max_seo_score } = req.body;
    
    const filters = {
      ...(site_id && { site_id: parseInt(site_id) }),
      ...(status && { status }),
      ...(language && { language }),
      ...(min_seo_score !== undefined && { min_seo_score: parseInt(min_seo_score) }),
      ...(max_seo_score !== undefined && { max_seo_score: parseInt(max_seo_score) }),
    };

    // Create job
    const job = await bulkSeoService.createBulkJob('seo_analysis', filters);
    
    // Start analysis in background
    analyzeArticlesInBackground(job.id, filters);
    
    res.status(202).json({
      data: job,
      message: 'SEO analysis started',
    });
  } catch (err: any) {
    logger.error('Failed to start SEO analysis:', err);
    res.status(500).json({ error: { code: 'START_ERROR', message: err.message } });
  }
});

// Start link checker
router.post('/check-links', async (req: AuthRequest, res: Response) => {
  try {
    const { site_id, article_id } = req.body;
    
    const filters = {
      ...(site_id && { site_id: parseInt(site_id) }),
      ...(article_id && { article_id: parseInt(article_id) }),
    };

    const job = await bulkSeoService.createBulkJob('link_checker', filters);
    
    // Start link checking in background
    checkLinksInBackground(job.id, filters);
    
    res.status(202).json({
      data: job,
      message: 'Link checking started',
    });
  } catch (err: any) {
    logger.error('Failed to start link checker:', err);
    res.status(500).json({ error: { code: 'START_ERROR', message: err.message } });
  }
});

// Generate internal link suggestions
router.post('/suggest-links', async (req: AuthRequest, res: Response) => {
  try {
    const { site_id } = req.body;
    
    const job = await bulkSeoService.createBulkJob('internal_links', { site_id });
    
    // Start suggestion generation in background
    generateLinkSuggestionsInBackground(job.id, site_id);
    
    res.status(202).json({
      data: job,
      message: 'Internal link suggestion generation started',
    });
  } catch (err: any) {
    logger.error('Failed to start link suggestion:', err);
    res.status(500).json({ error: { code: 'START_ERROR', message: err.message } });
  }
});

// Get link suggestions
router.get('/suggestions', async (req: AuthRequest, res: Response) => {
  try {
    const articleId = req.query.article_id ? parseInt(req.query.article_id as string) : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const { suggestions, total } = await bulkSeoService.getLinkSuggestions(articleId, page, limit);
    
    res.json({
      data: suggestions,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    logger.error('Failed to get link suggestions:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: err.message } });
  }
});

// Apply link suggestion
router.post('/suggestions/:id/apply', async (req: AuthRequest, res: Response) => {
  try {
    const suggestionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await bulkSeoService.applyLinkSuggestion(parseInt(suggestionId as string));
    res.json({ message: 'Link suggestion applied' });
  } catch (err: any) {
    logger.error('Failed to apply link suggestion:', err);
    res.status(500).json({ error: { code: 'APPLY_ERROR', message: err.message } });
  }
});

// Get broken links
router.get('/broken-links', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const linkType = req.query.type as 'internal' | 'external' | undefined;
    const articleId = req.query.article_id ? parseInt(req.query.article_id as string) : undefined;
    
    const { links, total } = await bulkSeoService.getBrokenLinks(page, limit, {
      link_type: linkType,
      article_id: articleId,
    });
    
    res.json({
      data: links,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    logger.error('Failed to get broken links:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: err.message } });
  }
});

// Export SEO report
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { site_id, status, language } = req.query;
    
    const filters = {
      ...(site_id && { site_id: parseInt(site_id as string) }),
      ...(status && { status: status as string }),
      ...(language && { language: language as string }),
    };

    const articles = await bulkSeoService.getArticlesForAnalysis(filters);
    
    // Analyze all articles
    const results = articles.map(article => bulkSeoService.analyzeArticleSEO(article));
    
    if (format === 'csv') {
      // Generate CSV
      const csv = generateCSV(results);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="seo-report.csv"');
      res.send(csv);
    } else {
      // Generate JSON
      res.json({
        data: results,
        meta: {
          total: results.length,
          generated_at: new Date().toISOString(),
        },
      });
    }
  } catch (err: any) {
    logger.error('Failed to export SEO report:', err);
    res.status(500).json({ error: { code: 'EXPORT_ERROR', message: err.message } });
  }
});

// Background job: Analyze articles
async function analyzeArticlesInBackground(
  jobId: number,
  filters: bulkSeoService.BulkAnalysisFilters
): Promise<void> {
  try {
    const articles = await bulkSeoService.getArticlesForAnalysis(filters);
    await bulkSeoService.startJob(jobId, articles.length);
    
    const results: bulkSeoService.SEOAnalysisResult[] = [];
    let processed = 0;
    let failed = 0;
    
    for (const article of articles) {
      try {
        const analysis = bulkSeoService.analyzeArticleSEO(article);
        results.push(analysis);
        processed++;
      } catch (err) {
        failed++;
        logger.error(`Failed to analyze article ${article.id}:`, err);
      }
      
      // Update progress every 10 items
      if (processed % 10 === 0) {
        await bulkSeoService.updateJobProgress(jobId, processed, failed);
      }
    }
    
    // Final update
    await bulkSeoService.updateJobProgress(jobId, processed, failed);
    
    // Calculate summary
    const summary = {
      total_analyzed: results.length,
      error_count: results.reduce((sum, r) => sum + r.issues.filter(i => i.type === 'error').length, 0),
      warning_count: results.reduce((sum, r) => sum + r.issues.filter(i => i.type === 'warning').length, 0),
      avg_seo_score: results.length > 0 
        ? Math.round(results.reduce((sum, r) => sum + r.seo_score, 0) / results.length)
        : 0,
      articles_with_errors: results.filter(r => r.issues.some(i => i.type === 'error')).length,
    };
    
    await bulkSeoService.completeJob(jobId, { summary, results: results.slice(0, 100) });
    logger.info(`SEO analysis job ${jobId} completed: ${processed} analyzed, ${failed} failed`);
  } catch (err: any) {
    await bulkSeoService.failJob(jobId, err.message);
    logger.error(`SEO analysis job ${jobId} failed:`, err);
  }
}

// Background job: Check links
async function checkLinksInBackground(
  jobId: number,
  filters: { site_id?: number; article_id?: number }
): Promise<void> {
  try {
    const articles = await bulkSeoService.getArticlesForAnalysis(filters);
    await bulkSeoService.startJob(jobId, articles.length);
    
    let processed = 0;
    let failed = 0;
    let brokenLinksFound = 0;
    
    for (const article of articles) {
      try {
        // Clear old broken links for this article
        await bulkSeoService.clearBrokenLinks(article.id);
        
        // Extract links
        const links = bulkSeoService.extractLinks(article.content);
        
        // Check external links
        for (const link of links.filter(l => l.type === 'external')) {
          try {
            const isBroken = await checkLink(link.url);
            if (isBroken) {
              await bulkSeoService.saveBrokenLink(
                article.id,
                link.url,
                'external',
                link.anchorText,
                undefined,
                'Link check failed'
              );
              brokenLinksFound++;
            }
          } catch (err) {
            // Link check error - mark as broken
            await bulkSeoService.saveBrokenLink(
              article.id,
              link.url,
              'external',
              link.anchorText,
              undefined,
              'Link check error'
            );
            brokenLinksFound++;
          }
        }
        
        processed++;
      } catch (err) {
        failed++;
        logger.error(`Failed to check links for article ${article.id}:`, err);
      }
      
      // Update progress every 5 items
      if (processed % 5 === 0) {
        await bulkSeoService.updateJobProgress(jobId, processed, failed);
      }
    }
    
    await bulkSeoService.updateJobProgress(jobId, processed, failed);
    await bulkSeoService.completeJob(jobId, {
      total_checked: processed,
      broken_links_found: brokenLinksFound,
    });
    
    logger.info(`Link checker job ${jobId} completed: ${processed} checked, ${brokenLinksFound} broken`);
  } catch (err: any) {
    await bulkSeoService.failJob(jobId, err.message);
    logger.error(`Link checker job ${jobId} failed:`, err);
  }
}

// Check if a link is broken (using HEAD request)
async function checkLink(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'AutoPress-Bot/1.0 (+https://autopress.io/bot)',
      },
    });
    
    clearTimeout(timeout);
    
    // Consider 4xx and 5xx as broken
    return !response.ok;
  } catch (err) {
    // Network errors, timeouts, etc. count as broken
    return true;
  }
}

// Background job: Generate link suggestions
async function generateLinkSuggestionsInBackground(
  jobId: number,
  siteId?: number
): Promise<void> {
  try {
    await bulkSeoService.startJob(jobId, 1);
    
    const suggestionsCreated = await bulkSeoService.generateLinkSuggestions(siteId);
    
    await bulkSeoService.updateJobProgress(jobId, 1, 0);
    await bulkSeoService.completeJob(jobId, {
      suggestions_created: suggestionsCreated,
    });
    
    logger.info(`Link suggestion job ${jobId} completed: ${suggestionsCreated} suggestions created`);
  } catch (err: any) {
    await bulkSeoService.failJob(jobId, err.message);
    logger.error(`Link suggestion job ${jobId} failed:`, err);
  }
}

// Generate CSV from analysis results
function generateCSV(results: bulkSeoService.SEOAnalysisResult[]): string {
  const headers = ['Article ID', 'Title', 'Slug', 'SEO Score', 'Word Count', 'Errors', 'Warnings'];
  const rows = results.map(r => [
    r.article_id,
    `"${r.title.replace(/"/g, '""')}"`,
    r.slug,
    r.seo_score,
    r.word_count,
    r.issues.filter(i => i.type === 'error').length,
    r.issues.filter(i => i.type === 'warning').length,
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export default router;
