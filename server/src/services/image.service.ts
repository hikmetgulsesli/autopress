/**
 * Image Search Service
 * Integrates with Unsplash API for stock photo search
 * Free tier: 50 requests/hour
 */

export interface ImageSearchResult {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    id: string;
    name: string;
    username: string;
    portfolio_url: string | null;
  };
  links: {
    html: string;
  };
  width: number;
  height: number;
  color: string | null;
}

export interface ImageSearchResponse {
  results: ImageSearchResult[];
  total: number;
  total_pages: number;
}

export interface ImageSearchOptions {
  query: string;
  page?: number;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
}

export interface ImageServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    id: string;
    name: string;
    username: string;
    portfolio_url: string | null;
  };
  links: {
    html: string;
  };
  width: number;
  height: number;
  color: string | null;
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

const UNSPLASH_API_BASE = 'https://api.unsplash.com';

function getApiKey(): string {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) {
    throw {
      code: 'MISSING_API_KEY',
      message: 'Unsplash API key not configured. Set UNSPLASH_ACCESS_KEY environment variable.',
    } as ImageServiceError;
  }
  return apiKey;
}

/**
 * Search for images on Unsplash
 */
export async function searchImages(
  options: ImageSearchOptions
): Promise<ImageSearchResponse> {
  const { query, page = 1, perPage = 12, orientation } = options;

  // Validate inputs
  if (!query || query.trim().length === 0) {
    throw {
      code: 'INVALID_QUERY',
      message: 'Search query is required',
    } as ImageServiceError;
  }

  if (query.trim().length > 100) {
    throw {
      code: 'QUERY_TOO_LONG',
      message: 'Search query must be less than 100 characters',
    } as ImageServiceError;
  }

  const apiKey = getApiKey();

  const params = new URLSearchParams({
    query: query.trim(),
    page: String(page),
    per_page: String(Math.min(Math.max(perPage, 1), 30)), // Clamp between 1-30
  });

  if (orientation) {
    params.append('orientation', orientation);
  }

  try {
    const response = await fetch(
      `${UNSPLASH_API_BASE}/search/photos?${params.toString()}`,
      {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
          'Accept-Version': 'v1',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { errors?: string[] };

      if (response.status === 401) {
        throw {
          code: 'AUTH_ERROR',
          message: 'Invalid Unsplash API key',
        } as ImageServiceError;
      }

      if (response.status === 403) {
        throw {
          code: 'RATE_LIMITED',
          message: 'Unsplash API rate limit exceeded. Free tier allows 50 requests/hour.',
        } as ImageServiceError;
      }

      if (response.status === 404) {
        throw {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
        } as ImageServiceError;
      }

      throw {
        code: 'API_ERROR',
        message: errorData.errors?.[0] || `Unsplash API error: ${response.statusText}`,
        details: { status: response.status },
      } as ImageServiceError;
    }

    const data = await response.json() as UnsplashSearchResponse;

    return {
      results: data.results.map((photo): ImageSearchResult => ({
        id: photo.id,
        urls: {
          raw: photo.urls.raw,
          full: photo.urls.full,
          regular: photo.urls.regular,
          small: photo.urls.small,
          thumb: photo.urls.thumb,
        },
        alt_description: photo.alt_description,
        description: photo.description,
        user: {
          id: photo.user.id,
          name: photo.user.name,
          username: photo.user.username,
          portfolio_url: photo.user.portfolio_url,
        },
        links: {
          html: photo.links.html,
        },
        width: photo.width,
        height: photo.height,
        color: photo.color,
      })),
      total: data.total,
      total_pages: data.total_pages,
    };
  } catch (err) {
    // Re-throw ImageServiceError as-is
    if ((err as ImageServiceError).code) {
      throw err;
    }

    // Handle network errors
    throw {
      code: 'NETWORK_ERROR',
      message: `Failed to connect to Unsplash API: ${(err as Error).message}`,
    } as ImageServiceError;
  }
}

/**
 * Get a single photo by ID
 */
export async function getPhoto(photoId: string): Promise<ImageSearchResult> {
  if (!photoId || photoId.trim().length === 0) {
    throw {
      code: 'INVALID_PHOTO_ID',
      message: 'Photo ID is required',
    } as ImageServiceError;
  }

  const apiKey = getApiKey();

  try {
    const response = await fetch(
      `${UNSPLASH_API_BASE}/photos/${photoId}`,
      {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
          'Accept-Version': 'v1',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw {
          code: 'PHOTO_NOT_FOUND',
          message: `Photo with ID ${photoId} not found`,
        } as ImageServiceError;
      }

      throw {
        code: 'API_ERROR',
        message: `Unsplash API error: ${response.statusText}`,
        details: { status: response.status },
      } as ImageServiceError;
    }

    const photo = await response.json() as UnsplashPhoto;

    return {
      id: photo.id,
      urls: {
        raw: photo.urls.raw,
        full: photo.urls.full,
        regular: photo.urls.regular,
        small: photo.urls.small,
        thumb: photo.urls.thumb,
      },
      alt_description: photo.alt_description,
      description: photo.description,
      user: {
        id: photo.user.id,
        name: photo.user.name,
        username: photo.user.username,
        portfolio_url: photo.user.portfolio_url,
      },
      links: {
        html: photo.links.html,
      },
      width: photo.width,
      height: photo.height,
      color: photo.color,
    };
  } catch (err) {
    if ((err as ImageServiceError).code) {
      throw err;
    }

    throw {
      code: 'NETWORK_ERROR',
      message: `Failed to connect to Unsplash API: ${(err as Error).message}`,
    } as ImageServiceError;
  }
}

/**
 * Generate attribution HTML for Unsplash
 */
export function generateAttribution(image: ImageSearchResult): string {
  return `Photo by <a href="https://unsplash.com/@${image.user.username}?utm_source=autopress&utm_medium=referral">${image.user.name}</a> on <a href="https://unsplash.com/?utm_source=autopress&utm_medium=referral">Unsplash</a>`;
}

/**
 * Generate attribution text (plain text version)
 */
export function generateAttributionText(image: ImageSearchResult): string {
  return `Photo by ${image.user.name} on Unsplash`;
}
