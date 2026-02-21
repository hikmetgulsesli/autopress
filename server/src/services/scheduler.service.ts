import cron from 'node-cron';
import { query } from '../db/connection';
import { logger } from '../utils/logger';
import * as wordpressService from './wordpress.service';
import * as bloggerService from './blogger.service';
import * as searchConsoleService from './searchconsole.service';

// Types
export type PublishStatus = 'pending' | 'publishing' | 'published' | 'failed' | 'cancelled';

export interface PublishQueueItem {
  id: number;
  article_id: number;
  site_id: number | null;
  scheduled_at: Date;
  scheduled_timezone: string;
  jitter_minutes: number;
  status: PublishStatus;
  attempts: number;
  max_attempts: number;
  last_attempt_at: Date | null;
  error_message: string | null;
  published_at: Date | null;
  wordpress_id: number | null;
  wordpress_url: string | null;
}

export interface Schedule {
  id: number;
  site_id: number;
  day_of_week: number | null;
  publish_time: string | null;
  publish_date: Date | null;
  publish_datetime: Date | null;
  timezone: string;
  jitter_enabled: boolean;
  jitter_minutes: number;
  is_active: boolean;
}

export interface SchedulerConfig {
  cronExpression: string;
  jitterEnabled: boolean;
  maxRetries: number;
  timezone: string;
}

export interface SchedulerServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Default configuration
const DEFAULT_CONFIG: SchedulerConfig = {
  cronExpression: '*/5 * * * *', // Every 5 minutes
  jitterEnabled: true,
  maxRetries: 3,
  timezone: 'Europe/Istanbul',
};

// Scheduler state
let schedulerTask: cron.ScheduledTask | null = null;
let isRunning = false;

/**
 * Generate random jitter in minutes (±15 minutes by default)
 */
export const generateJitter = (maxJitterMinutes: number = 15): number => {
  // Generate random number between -maxJitterMinutes and +maxJitterMinutes
  return Math.floor(Math.random() * (maxJitterMinutes * 2 + 1)) - maxJitterMinutes;
};

/**
 * Apply jitter to a scheduled time
 */
export const applyJitter = (scheduledTime: Date, jitterMinutes: number): Date => {
  const jitteredTime = new Date(scheduledTime);
  jitteredTime.setMinutes(jitteredTime.getMinutes() + jitterMinutes);
  return jitteredTime;
};

/**
 * Log publish history entry
 */
const logPublishHistory = async (
  articleId: number,
  siteId: number | null,
  queueId: number | null,
  platform: string,
  status: string,
  platformPostId?: string,
  errorMessage?: string,
  attemptNumber: number = 1,
  indexingSubmitted?: boolean,
  indexingError?: string
): Promise<void> => {
  try {
    await query(
      `INSERT INTO publish_history 
       (article_id, site_id, queue_id, platform, platform_post_id, status, error_message, attempt_number, published_at, indexing_submitted, indexing_error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)`,
      [articleId, siteId, queueId, platform, platformPostId || null, status, errorMessage || null, attemptNumber, indexingSubmitted || false, indexingError || null]
    );
  } catch (err) {
    logger.error('Failed to log publish history:', err);
  }
};

/**
 * Get pending articles that are due for publishing
 */
export const getDueArticles = async (): Promise<PublishQueueItem[]> => {
  try {
    const result = await query(
      `SELECT * FROM publish_queue 
       WHERE status = 'pending' 
       AND scheduled_at <= NOW() 
       AND attempts < max_attempts
       ORDER BY scheduled_at ASC`,
      []
    );
    return result.rows as PublishQueueItem[];
  } catch (err) {
    logger.error('Failed to get due articles:', err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to fetch due articles from database',
    } as SchedulerServiceError;
  }
};

/**
 * Update queue item status
 */
export const updateQueueStatus = async (
  queueId: number,
  status: PublishStatus,
  errorMessage?: string,
  wordpressId?: number,
  wordpressUrl?: string
): Promise<void> => {
  try {
    const updates: string[] = ['status = $1', 'updated_at = NOW()'];
    const params: (string | number | null)[] = [status];
    let paramIndex = 2;

    if (errorMessage !== undefined) {
      updates.push(`error_message = $${paramIndex++}`);
      params.push(errorMessage);
    }

    if (wordpressId !== undefined) {
      updates.push(`wordpress_id = $${paramIndex++}`);
      params.push(wordpressId);
    }

    if (wordpressUrl !== undefined) {
      updates.push(`wordpress_url = $${paramIndex++}`);
      params.push(wordpressUrl);
    }

    if (status === 'publishing') {
      updates.push(`attempts = attempts + 1`);
      updates.push(`last_attempt_at = NOW()`);
    }

    if (status === 'published') {
      updates.push(`published_at = NOW()`);
    }

    params.push(queueId);

    await query(
      `UPDATE publish_queue SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );
  } catch (err) {
    logger.error(`Failed to update queue status for item ${queueId}:`, err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to update queue status',
    } as SchedulerServiceError;
  }
};

/**
 * Get article details for publishing
 */
const getArticleForPublish = async (articleId: number): Promise<{
  id: number;
  title: string;
  content: string;
  excerpt: string | null;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  site_id: number | null;
} | null> => {
  try {
    const result = await query(
      `SELECT id, title, content, excerpt, slug, meta_title, meta_description, featured_image_url, site_id 
       FROM articles WHERE id = $1`,
      [articleId]
    );
    return result.rows[0] || null;
  } catch (err) {
    logger.error(`Failed to get article ${articleId}:`, err);
    return null;
  }
};

/**
 * Get site details for publishing
 */
const getSiteForPublish = async (siteId: number): Promise<{
  id: number;
  platform: string;
  api_credentials: Record<string, unknown>;
} | null> => {
  try {
    const result = await query(
      `SELECT id, platform, api_credentials FROM sites WHERE id = $1`,
      [siteId]
    );
    return result.rows[0] || null;
  } catch (err) {
    logger.error(`Failed to get site ${siteId}:`, err);
    return null;
  }
};

/**
 * Update article status after publishing
 */
const updateArticleStatus = async (
  articleId: number,
  status: string,
  publishedUrl?: string
): Promise<void> => {
  try {
    await query(
      `UPDATE articles SET status = $1, published_url = COALESCE($2, published_url), published_at = NOW() WHERE id = $3`,
      [status, publishedUrl || null, articleId]
    );
  } catch (err) {
    logger.error(`Failed to update article ${articleId} status:`, err);
  }
};

/**
 * Publish a single article (supports both WordPress and Blogger)
 */
export const publishArticle = async (queueItem: PublishQueueItem): Promise<void> => {
  const { id: queueId, article_id, site_id, attempts, max_attempts } = queueItem;

  try {
    // Set status to publishing
    await updateQueueStatus(queueId, 'publishing');

    // Get article details
    const article = await getArticleForPublish(article_id);
    if (!article) {
      throw new Error(`Article ${article_id} not found`);
    }

    // Get site details
    if (!site_id) {
      throw new Error(`Article ${article_id} has no site associated`);
    }

    const site = await getSiteForPublish(site_id);
    if (!site) {
      throw new Error(`Site ${site_id} not found`);
    }

    const platform = site.platform.toLowerCase();

    // Publish based on platform
    let platformPostId: string;
    let publishedUrl: string;
    let indexingSubmitted = false;
    let indexingError: string | undefined;

    if (platform === 'blogger') {
      // Publish to Blogger
      const credentials = site.api_credentials as {
        blogId: string;
        accessToken: string;
        refreshToken: string;
        expiryDate?: number;
      };

      // Set Blogger credentials
      bloggerService.setCredentials({
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiryDate: credentials.expiryDate || Date.now() + 3600 * 1000,
      });

      // Publish post
      const result = await bloggerService.publishPost(
        {
          blogId: credentials.blogId,
          title: article.title,
          content: article.content,
          labels: [],
          isDraft: false,
        },
        article_id,
        site_id
      );

      platformPostId = result.id;
      publishedUrl = result.url;

      // Update queue status to published
      await updateQueueStatus(queueId, 'published', undefined, undefined, publishedUrl);

      // Update article status
      await updateArticleStatus(article_id, 'published', publishedUrl);

      // Auto-submit to Google Search Console for indexing
      try {
        if (publishedUrl) {
          const indexResult = await searchConsoleService.autoSubmitAfterPublish(publishedUrl, article_id);
          indexingSubmitted = indexResult.success;
          if (!indexResult.success) {
            indexingError = indexResult.message;
          }
        }
      } catch (indexErr) {
        logger.warn(`Auto-indexing failed for article ${article_id}:`, indexErr);
        indexingError = indexErr instanceof Error ? indexErr.message : 'Unknown indexing error';
        // Don't fail publish if indexing fails
      }

      // Log success
      await logPublishHistory(
        article_id,
        site_id,
        queueId,
        'blogger',
        'published',
        platformPostId,
        undefined,
        attempts + 1,
        indexingSubmitted,
        indexingError
      );

      logger.info(`Successfully published article ${article_id} to Blogger (ID: ${platformPostId})${indexingSubmitted ? ' and submitted for indexing' : ''}`);
    } else if (platform === 'wordpress') {
      // Publish to WordPress (maintain existing behavior)
      const credentials = site.api_credentials as {
        siteUrl: string;
        username: string;
        applicationPassword: string;
      };

      // Prepare post data
      const postData: wordpressService.WordPressPost = {
        title: article.title,
        content: article.content,
        excerpt: article.excerpt || undefined,
        slug: article.slug || undefined,
        status: 'publish',
      };

      // Publish to WordPress
      const result = await wordpressService.publishPostWithConfig(article_id, postData, credentials);

      platformPostId = result.wordpressId.toString();
      publishedUrl = result.wordpressUrl;

      // Update queue status to published
      await updateQueueStatus(queueId, 'published', undefined, result.wordpressId, publishedUrl);

      // Update article status
      await updateArticleStatus(article_id, 'published', publishedUrl);

      // Auto-submit to Google Search Console for indexing
      try {
        if (publishedUrl) {
          const indexResult = await searchConsoleService.autoSubmitAfterPublish(publishedUrl, article_id);
          indexingSubmitted = indexResult.success;
          if (!indexResult.success) {
            indexingError = indexResult.message;
          }
        }
      } catch (indexErr) {
        logger.warn(`Auto-indexing failed for article ${article_id}:`, indexErr);
        indexingError = indexErr instanceof Error ? indexErr.message : 'Unknown indexing error';
        // Don't fail publish if indexing fails
      }

      // Log success
      await logPublishHistory(
        article_id,
        site_id,
        queueId,
        'wordpress',
        'published',
        platformPostId,
        undefined,
        attempts + 1,
        indexingSubmitted,
        indexingError
      );

      logger.info(`Successfully published article ${article_id} to WordPress (ID: ${platformPostId})${indexingSubmitted ? ' and submitted for indexing' : ''}`);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const newAttempts = attempts + 1;

    // Determine platform for logging
    let platform = 'unknown';
    if (site_id) {
      const site = await getSiteForPublish(site_id);
      if (site) {
        platform = site.platform.toLowerCase();
      }
    }

    // Determine if we should retry
    if (newAttempts >= max_attempts) {
      // Max retries reached, mark as failed
      await updateQueueStatus(queueId, 'failed', errorMessage);
      await updateArticleStatus(article_id, 'publish_failed');

      logger.error(`Failed to publish article ${article_id} to ${platform} after ${max_attempts} attempts: ${errorMessage}`);
    } else {
      // Retry later - keep as pending
      await updateQueueStatus(queueId, 'pending', errorMessage);
      logger.warn(`Publish attempt ${newAttempts} failed for article ${article_id} to ${platform}, will retry: ${errorMessage}`);
    }

    // Log failure
    await logPublishHistory(
      article_id,
      site_id,
      queueId,
      platform,
      'failed',
      undefined,
      errorMessage,
      newAttempts
    );

    // Re-throw for caller to handle
    throw err;
  }
};

/**
 * Process all due articles in the queue
 */
export const processQueue = async (): Promise<{
  processed: number;
  published: number;
  failed: number;
}> => {
  const stats = { processed: 0, published: 0, failed: 0 };

  try {
    const dueArticles = await getDueArticles();

    if (dueArticles.length === 0) {
      return stats;
    }

    logger.info(`Processing ${dueArticles.length} scheduled articles`);

    for (const article of dueArticles) {
      stats.processed++;

      try {
        await publishArticle(article);
        stats.published++;
      } catch (err) {
        stats.failed++;
        // Error is already logged in publishArticle
      }
    }

    logger.info(`Queue processing complete: ${stats.published} published, ${stats.failed} failed`);
    return stats;
  } catch (err) {
    logger.error('Queue processing error:', err);
    throw err;
  }
};

/**
 * Schedule an article for publishing
 */
export const scheduleArticle = async (
  articleId: number,
  siteId: number | null,
  scheduledAt: Date,
  timezone: string = 'Europe/Istanbul',
  enableJitter: boolean = true,
  maxJitterMinutes: number = 15
): Promise<PublishQueueItem> => {
  try {
    // Calculate jitter
    const jitterMinutes = enableJitter ? generateJitter(maxJitterMinutes) : 0;
    const jitteredTime = applyJitter(scheduledAt, jitterMinutes);

    const result = await query(
      `INSERT INTO publish_queue 
       (article_id, site_id, scheduled_at, scheduled_timezone, jitter_minutes, status, attempts, max_attempts)
       VALUES ($1, $2, $3, $4, $5, 'pending', 0, $6)
       RETURNING *`,
      [articleId, siteId, jitteredTime, timezone, jitterMinutes, DEFAULT_CONFIG.maxRetries]
    );

    // Update article status to scheduled
    await query(
      `UPDATE articles SET status = 'scheduled' WHERE id = $1`,
      [articleId]
    );

    logger.info(`Article ${articleId} scheduled for ${jitteredTime.toISOString()} (jitter: ${jitterMinutes}min)`);

    return result.rows[0] as PublishQueueItem;
  } catch (err) {
    logger.error(`Failed to schedule article ${articleId}:`, err);
    throw {
      code: 'SCHEDULE_ERROR',
      message: 'Failed to schedule article for publishing',
    } as SchedulerServiceError;
  }
};

/**
 * Cancel a scheduled article
 */
export const cancelScheduledArticle = async (queueId: number): Promise<boolean> => {
  try {
    const result = await query(
      `UPDATE publish_queue SET status = 'cancelled', updated_at = NOW() 
       WHERE id = $1 AND status = 'pending' 
       RETURNING article_id`,
      [queueId]
    );

    if (result.rows.length > 0) {
      const articleId = result.rows[0].article_id;
      await query(
        `UPDATE articles SET status = 'draft' WHERE id = $1`,
        [articleId]
      );
      logger.info(`Cancelled scheduled publish for queue item ${queueId}, article ${articleId}`);
      return true;
    }

    return false;
  } catch (err) {
    logger.error(`Failed to cancel scheduled article ${queueId}:`, err);
    throw {
      code: 'CANCEL_ERROR',
      message: 'Failed to cancel scheduled article',
    } as SchedulerServiceError;
  }
};

/**
 * Get queue statistics
 */
export const getQueueStats = async (): Promise<{
  pending: number;
  publishing: number;
  published: number;
  failed: number;
  cancelled: number;
  total: number;
}> => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'publishing') as publishing,
        COUNT(*) FILTER (WHERE status = 'published') as published,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) as total
       FROM publish_queue`,
      []
    );

    return result.rows[0];
  } catch (err) {
    logger.error('Failed to get queue stats:', err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to fetch queue statistics',
    } as SchedulerServiceError;
  }
};

/**
 * Get scheduled articles with pagination
 */
export const getScheduledArticles = async (
  status?: PublishStatus,
  limit: number = 50,
  offset: number = 0
): Promise<{ items: PublishQueueItem[]; total: number }> => {
  try {
    let whereClause = '';
    const params: (string | number)[] = [];

    if (status) {
      whereClause = 'WHERE status = $1';
      params.push(status);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM publish_queue ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM publish_queue ${whereClause} 
       ORDER BY scheduled_at DESC 
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      items: result.rows as PublishQueueItem[],
      total,
    };
  } catch (err) {
    logger.error('Failed to get scheduled articles:', err);
    throw {
      code: 'DB_ERROR',
      message: 'Failed to fetch scheduled articles',
    } as SchedulerServiceError;
  }
};

/**
 * Start scheduler cron job
 */
export const startScheduler = (config: Partial<SchedulerConfig> = {}): void => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (schedulerTask) {
    logger.warn('Scheduler is already running');
    return;
  }

  logger.info(`Starting scheduler with cron: ${finalConfig.cronExpression}`);

  schedulerTask = cron.schedule(
    finalConfig.cronExpression,
    async () => {
      if (isRunning) {
        logger.warn('Previous queue processing is still running, skipping this cycle');
        return;
      }

      isRunning = true;
      try {
        await processQueue();
      } catch (err) {
        logger.error('Error in scheduler processQueue:', err);
      } finally {
        isRunning = false;
      }
    },
    {
      scheduled: true,
      timezone: finalConfig.timezone,
    }
  );

  logger.info('Scheduler started successfully');
};

/**
 * Stop scheduler cron job
 */
export const stopScheduler = (): void => {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    logger.info('Scheduler stopped');
  } else {
    logger.warn('Scheduler is not running');
  }
};

/**
 * Get scheduler status
 */
export const getSchedulerStatus = (): {
  running: boolean;
  isProcessing: boolean;
  config: SchedulerConfig;
} => {
  return {
    running: schedulerTask !== null,
    isProcessing: isRunning,
    config: DEFAULT_CONFIG,
  };
};

/**
 * Retry a failed publish
 */
export const retryFailedPublish = async (queueId: number): Promise<boolean> => {
  try {
    const result = await query(
      `UPDATE publish_queue 
       SET status = 'pending', error_message = NULL, updated_at = NOW()
       WHERE id = $1 AND status = 'failed' AND attempts < max_attempts
       RETURNING id`,
      [queueId]
    );

    if (result.rows.length > 0) {
      logger.info(`Retry scheduled for failed publish queue item ${queueId}`);
      return true;
    }

    return false;
  } catch (err) {
    logger.error(`Failed to retry publish ${queueId}:`, err);
    throw {
      code: 'RETRY_ERROR',
      message: 'Failed to retry failed publish',
    } as SchedulerServiceError;
  }
};

// Export default config for testing
export { DEFAULT_CONFIG };
