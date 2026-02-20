import { google, searchconsole_v1 } from 'googleapis';

// Types
export interface IndexingOptions {
  url: string;
}

export interface IndexingResult {
  success: boolean;
  url: string;
  message: string;
}

export interface IndexStatusResult {
  url: string;
  indexed: boolean;
  lastCrawled?: string;
  crawlStatus?: string;
}

export interface SearchConsoleServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
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

// Submit URL for indexing
export const submitUrlForIndexing = async (options: IndexingOptions): Promise<IndexingResult> => {
  const { url } = options;

  // Validate URL
  if (!url || url.trim().length === 0) {
    throw {
      code: 'INVALID_URL',
      message: 'URL is required',
    } as SearchConsoleServiceError;
  }

  try {
    const searchConsole = await getSearchConsoleClient();

    await searchConsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: url,
        siteUrl: process.env.GOOGLE_SITE_URL,
      },
    });

    return {
      success: true,
      url,
      message: 'URL submitted for indexing',
    };
  } catch (err) {
    const error = err as { response?: { status?: number }; message?: string };

    if (error.response?.status === 401 || error.response?.status === 403) {
      throw {
        code: 'AUTH_ERROR',
        message: 'Invalid Google credentials or insufficient permissions',
      } as SearchConsoleServiceError;
    }

    if (error.response?.status === 429) {
      throw {
        code: 'QUOTA_EXCEEDED',
        message: 'Google Search Console API quota exceeded',
      } as SearchConsoleServiceError;
    }

    throw {
      code: 'API_ERROR',
      message: `Failed to submit URL for indexing: ${error.message || 'Unknown error'}`,
    } as SearchConsoleServiceError;
  }
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

  try {
    const searchConsole = await getSearchConsoleClient();

    const response = await searchConsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: url,
        siteUrl: process.env.GOOGLE_SITE_URL,
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
      indexed: indexingStatus?.verdict === 'PASS',
      lastCrawled: indexingStatus?.lastCrawlTime?.toString(),
      crawlStatus: indexingStatus?.coverageState?.toString(),
    };
  } catch (err) {
    const error = err as { response?: { status?: number }; message?: string };

    if (error.response?.status === 401 || error.response?.status === 403) {
      throw {
        code: 'AUTH_ERROR',
        message: 'Invalid Google credentials or insufficient permissions',
      } as SearchConsoleServiceError;
    }

    throw {
      code: 'API_ERROR',
      message: `Failed to check URL indexing status: ${error.message || 'Unknown error'}`,
    } as SearchConsoleServiceError;
  }
};

// Batch submit URLs for indexing
export const batchSubmitUrls = async (urls: string[]): Promise<IndexingResult[]> => {
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

  const results: IndexingResult[] = [];

  for (const url of urls) {
    try {
      const result = await submitUrlForIndexing({ url });
      results.push(result);
    } catch (err) {
      results.push({
        success: false,
        url,
        message: (err as SearchConsoleServiceError).message,
      });
    }
  }

  return results;
};
