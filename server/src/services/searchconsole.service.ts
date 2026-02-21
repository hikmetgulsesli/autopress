import { google, searchconsole_v1, indexing_v3 } from 'googleapis';
import { query } from '../db/connection';
import { logger } from '../utils/logger';

// Constants
const MAX_DAILY_QUOTA = 200;

// Types
export interface IndexingOptions {
  url: string;
  type?: 'URL_UPDATED' | 'URL_DELETED';
}

export interface IndexingResult {
  success: boolean;
  url: string;
  message: string;
  notificationType?: string;
}

export interface IndexStatusResult {
  url: string;
  indexed: boolean;
  lastCrawled?: string;
  crawlStatus?: string;
  verdict?: string;
  coverageState?: string;
}

export interface SearchConsoleServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface IndexingQuotaInfo {
  dailyQuota: number;
  usedQuota: number;
  remainingQuota: number;
  resetTime?: Date;
}

// Get authenticated Search Console client
const getSearchConsoleClient = async (): Promise<searchconsole_v1.Searchconsole> => {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const siteUrl = process.env.GOOGLE_SITE_URL;

  if (!clientEmail || !privateKey || !siteUrl) {
    throw {
      code: 'MISSING_CONFIG',
      message: 'Google Search Console configuration not found. Set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SITE_URL environment variables.',
    } as SearchConsoleServiceError;
  }

  const auth = new google.auth.JWT(clientEmail, undefined, privateKey, [
    'https://www.googleapis.com/auth/searchconsole',
  ]);

  const searchConsole = google.searchconsole({ version: 'v1', auth });
  return searchConsole;
};

// Get authenticated Indexing API client
const getIndexingClient = async (): Promise<indexing_v3.Indexing> => {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw {
      code: 'MISSING_CONFIG',
      message: 'Google Indexing API configuration not found. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.',
    } as SearchConsoleServiceError;
  }

  const auth = new google.auth.JWT(clientEmail, undefined, privateKey, [
    'https://www.googleapis.com/auth/indexing',
  ]);

  const indexing = google.indexing({ version: 'v3', auth });
  return indexing;
};

// Validate URL format
const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Handle API errors consistently
const handleApiError = (err: unknown, operation: string): never => {
  const error = err as { 
    response?: { status?: number; data?: { error?: { message?: string } } }; 
    message?: string;
    code?: string;
  };

  logger.error(`Search Console API error during ${operation}:`, { 
    status: error.response?.status, 
    message: error.message,
    code: error.code 
  });

  if (error.response?.status === 401 || error.response?.status === 403) {
    throw {
      code: 'AUTH_ERROR',
      message: 'Invalid Google credentials or insufficient permissions. Ensure the service account has access to the site in Search Console.',
      details: { originalError: error.message },
    } as SearchConsoleServiceError;
  }

  if (error.response?.status === 429) {
    throw {
      code: 'QUOTA_EXCEEDED',
      message: 'Google Indexing API quota exceeded. Daily limit is 200 URL notifications per site.',
      details: { resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
    } as SearchConsoleServiceError;
  }

  if (error.response?.status === 404) {
    throw {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      details: { originalError: error.message },
    } as SearchConsoleServiceError;
  }

  if (error.response?.status === 400) {
    throw {
      code: 'INVALID_REQUEST',
      message: error.response?.data?.error?.message || 'Invalid request parameters.',
      details: { originalError: error.message },
    } as SearchConsoleServiceError;
  }

  throw {
    code: 'API_ERROR',
    message: `Failed during ${operation}: ${error.message || 'Unknown error'}`,
    details: { originalError: error.message },
  } as SearchConsoleServiceError;
};

// Submit URL for indexing using Indexing API
export const submitUrlForIndexing = async (options: IndexingOptions): Promise<IndexingResult> => {
  const { url, type = 'URL_UPDATED' } = options;
  const siteUrl = process.env.GOOGLE_SITE_URL || 'default';

  // Validate URL
  if (!url || url.trim().length === 0) {
    throw {
      code: 'INVALID_URL',
      message: 'URL is required',
    } as SearchConsoleServiceError;
  }

  if (!validateUrl(url)) {
    throw {
      code: 'INVALID_URL',
      message: 'Invalid URL format. URL must be a valid HTTP or HTTPS URL.',
    } as SearchConsoleServiceError;
  }

  // Check quota before submitting
  await enforceQuotaLimit(siteUrl);

  try {
    const indexing = await getIndexingClient();

    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url: url.trim(),
        type: type,
      },
    });

    // Increment quota on successful submission
    await incrementQuotaUsage(siteUrl);

    logger.info(`URL submitted for indexing: ${url}`, { type });

    return {
      success: true,
      url,
      message: `URL submitted for indexing (${type})`,
      notificationType: type,
    };
  } catch (err) {
    return handleApiError(err, 'submitUrlForIndexing');
  }
};

// Notify URL update (convenience method)
export const notifyUrlUpdated = async (url: string): Promise<IndexingResult> => {
  return submitUrlForIndexing({ url, type: 'URL_UPDATED' });
};

// Notify URL deletion (convenience method)
export const notifyUrlDeleted = async (url: string): Promise<IndexingResult> => {
  return submitUrlForIndexing({ url, type: 'URL_DELETED' });
};

// Check URL indexing status
export const checkUrlIndexStatus = async (options: IndexingOptions): Promise<IndexStatusResult> => {
  const { url } = options;

  // Validate URL
  if (!url || url.trim().length === 0) {
    throw {
      code: 'INVALID_URL',
      message: 'URL is required',
    } as SearchConsoleServiceError;
  }

  if (!validateUrl(url)) {
    throw {
      code: 'INVALID_URL',
      message: 'Invalid URL format. URL must be a valid HTTP or HTTPS URL.',
    } as SearchConsoleServiceError;
  }

  try {
    const searchConsole = await getSearchConsoleClient();
    const siteUrl = process.env.GOOGLE_SITE_URL;

    if (!siteUrl) {
      throw {
        code: 'MISSING_CONFIG',
        message: 'GOOGLE_SITE_URL environment variable is not set.',
      } as SearchConsoleServiceError;
    }

    const response = await searchConsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: url.trim(),
        siteUrl: siteUrl,
      },
    });

    const inspectionResult = response.data.inspectionResult;
    
    if (!inspectionResult) {
      return {
        url,
        indexed: false,
      };
    }

    const indexingStatus = inspectionResult.indexStatusResult;
    
    return {
      url,
      indexed: indexingStatus?.verdict === 'PASS' || indexingStatus?.verdict === 'PASS_WITH_WARNING',
      lastCrawled: indexingStatus?.lastCrawlTime?.toString(),
      crawlStatus: indexingStatus?.coverageState?.toString(),
      verdict: indexingStatus?.verdict?.toString(),
      coverageState: indexingStatus?.coverageState?.toString(),
    };
  } catch (err) {
    const error = err as SearchConsoleServiceError;
    if (error.code === 'MISSING_CONFIG' || error.code === 'AUTH_ERROR') {
      throw err;
    }
    return handleApiError(err, 'checkUrlIndexStatus');
  }
};

// Get URL notification metadata from Indexing API
export const getUrlNotificationMetadata = async (url: string): Promise<{
  url: string;
  lastUpdateTime?: string;
  lastDeleteTime?: string;
  latestUpdateForUrl?: {
    type?: string;
    notifyTime?: string;
    url?: string;
  };
} | null> => {
  if (!url || url.trim().length === 0) {
    throw {
      code: 'INVALID_URL',
      message: 'URL is required',
    } as SearchConsoleServiceError;
  }

  if (!validateUrl(url)) {
    throw {
      code: 'INVALID_URL',
      message: 'Invalid URL format. URL must be a valid HTTP or HTTPS URL.',
    } as SearchConsoleServiceError;
  }

  try {
    const indexing = await getIndexingClient();

    const response = await indexing.urlNotifications.getMetadata({
      url: url.trim(),
    });

    // The response data is the metadata itself
    const metadata = response.data as unknown as {
      latestUpdate?: { notifyTime?: string; type?: string; url?: string };
      latestRemove?: { notifyTime?: string };
    };

    return {
      url,
      lastUpdateTime: metadata?.latestUpdate?.notifyTime,
      lastDeleteTime: metadata?.latestRemove?.notifyTime,
      latestUpdateForUrl: metadata?.latestUpdate,
    };
  } catch (err) {
    const error = err as { response?: { status?: number } };
    if (error.response?.status === 404) {
      return null;
    }
    return handleApiError(err, 'getUrlNotificationMetadata');
  }
};

// Batch submit URLs for indexing with rate limiting awareness
export const batchSubmitUrls = async (
  urls: string[], 
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
): Promise<IndexingResult[]> => {
  if (!urls || urls.length === 0) {
    throw {
      code: 'INVALID_URLS',
      message: 'At least one URL is required',
    } as SearchConsoleServiceError;
  }

  if (urls.length > 100) {
    throw {
      code: 'BATCH_TOO_LARGE',
      message: 'Maximum 100 URLs can be submitted at once',
    } as SearchConsoleServiceError;
  }

  // Validate all URLs first
  const invalidUrls = urls.filter(url => !validateUrl(url));
  if (invalidUrls.length > 0) {
    throw {
      code: 'INVALID_URLS',
      message: `Invalid URLs found: ${invalidUrls.join(', ')}`,
      details: { invalidUrls },
    } as SearchConsoleServiceError;
  }

  const results: IndexingResult[] = [];
  let quotaExceeded = false;

  for (const url of urls) {
    if (quotaExceeded) {
      results.push({
        success: false,
        url,
        message: 'Skipped due to quota exceeded in batch',
      });
      continue;
    }

    try {
      const result = await submitUrlForIndexing({ url, type });
      results.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      const error = err as SearchConsoleServiceError;
      if (error.code === 'QUOTA_EXCEEDED') {
        quotaExceeded = true;
      }
      results.push({
        success: false,
        url,
        message: error.message,
      });
    }
  }

  return results;
};

// Auto-submit URL after successful publish
export const autoSubmitAfterPublish = async (
  url: string, 
  articleId?: number
): Promise<IndexingResult> => {
  try {
    logger.info(`Auto-submitting URL after publish: ${url}`, { articleId });
    
    const result = await notifyUrlUpdated(url);
    
    logger.info(`Auto-submit successful: ${url}`, { 
      articleId, 
      notificationType: result.notificationType 
    });
    
    return result;
  } catch (err) {
    const error = err as SearchConsoleServiceError;
    
    logger.error(`Auto-submit failed for URL: ${url}`, { 
      articleId, 
      errorCode: error.code, 
      errorMessage: error.message 
    });
    
    // Don't throw - auto-submit failures shouldn't break the publish flow
    return {
      success: false,
      url,
      message: `Auto-submit failed: ${error.message}`,
    };
  }
};

// Check service health and configuration
export const checkServiceHealth = async (): Promise<{
  healthy: boolean;
  configured: boolean;
  message: string;
  details?: Record<string, unknown>;
}> => {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const siteUrl = process.env.GOOGLE_SITE_URL;

  if (!clientEmail || !privateKey || !siteUrl) {
    return {
      healthy: false,
      configured: false,
      message: 'Google Search Console configuration incomplete',
      details: {
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
        hasSiteUrl: !!siteUrl,
      },
    };
  }

  try {
    // Try to get a client to verify credentials work
    await getIndexingClient();
    
    return {
      healthy: true,
      configured: true,
      message: 'Google Search Console service is healthy',
      details: {
        clientEmail,
        siteUrl,
      },
    };
  } catch (err) {
    const error = err as SearchConsoleServiceError;
    return {
      healthy: false,
      configured: true,
      message: `Service configuration error: ${error.message}`,
      details: { errorCode: error.code },
    };
  }
};

// ============== Quota Tracking Functions ==============

// Get current quota usage from database
const getCurrentQuotaUsage = async (siteUrl: string = 'default'): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const result = await query(
      'SELECT submissions_count FROM indexing_quota WHERE site_url = $1 AND submissions_date = $2',
      [siteUrl, today]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].submissions_count;
    }
    return 0;
  } catch (err) {
    logger.error('Error getting quota usage:', err);
    return 0;
  }
};

// Increment quota usage in database
const incrementQuotaUsage = async (siteUrl: string = 'default'): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Use upsert to handle both insert and update
    await query(
      `INSERT INTO indexing_quota (site_url, submissions_date, submissions_count, created_at, updated_at)
       VALUES ($1, $2, 1, NOW(), NOW())
       ON CONFLICT (site_url, submissions_date)
       DO UPDATE SET 
         submissions_count = indexing_quota.submissions_count + 1,
         updated_at = NOW()`,
      [siteUrl, today]
    );
  } catch (err) {
    logger.error('Error incrementing quota:', err);
  }
};

// Check if quota is available
const checkQuotaAvailable = async (siteUrl: string = 'default'): Promise<boolean> => {
  const usedQuota = await getCurrentQuotaUsage(siteUrl);
  return usedQuota < MAX_DAILY_QUOTA;
};

// Get quota information from database
export const getQuotaInfo = async (): Promise<IndexingQuotaInfo> => {
  const siteUrl = process.env.GOOGLE_SITE_URL || 'default';
  const usedQuota = await getCurrentQuotaUsage(siteUrl);
  
  // Calculate reset time (midnight tonight)
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setDate(resetTime.getDate() + 1);
  resetTime.setHours(0, 0, 0, 0);
  
  return {
    dailyQuota: MAX_DAILY_QUOTA,
    usedQuota,
    remainingQuota: MAX_DAILY_QUOTA - usedQuota,
    resetTime,
  };
};

// Get quota info synchronously (for cases where async is not possible)
export const getQuotaInfoSync = (usedQuota: number): IndexingQuotaInfo => {
  // Calculate reset time (midnight tonight)
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setDate(resetTime.getDate() + 1);
  resetTime.setHours(0, 0, 0, 0);
  
  return {
    dailyQuota: MAX_DAILY_QUOTA,
    usedQuota,
    remainingQuota: MAX_DAILY_QUOTA - usedQuota,
    resetTime,
  };
};

// Enforce quota check before submitting
const enforceQuotaLimit = async (siteUrl: string = 'default'): Promise<void> => {
  const available = await checkQuotaAvailable(siteUrl);
  if (!available) {
    const usedQuota = await getCurrentQuotaUsage(siteUrl);
    throw {
      code: 'QUOTA_EXCEEDED',
      message: `Google Indexing API quota exceeded. Daily limit is ${MAX_DAILY_QUOTA} URL notifications per site. Used: ${usedQuota}/${MAX_DAILY_QUOTA}`,
      details: { 
        usedQuota, 
        dailyQuota: MAX_DAILY_QUOTA,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
      },
    } as SearchConsoleServiceError;
  }
};
