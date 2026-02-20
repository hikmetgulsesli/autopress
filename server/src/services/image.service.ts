// Image Search Service - Unsplash/Pexels Integration
// Using Unsplash API (free tier: 50 requests/hour)

export interface ImageSearchResult {
  id: string;
  url: string;
  thumbUrl: string;
  description: string | null;
  altDescription: string | null;
  width: number;
  height: number;
  photographer: {
    name: string;
    username: string;
    portfolioUrl: string;
  };
  color: string | null;
}

export interface ImageSearchResponse {
  results: ImageSearchResult[];
  total: number;
  totalPages: number;
  page: number;
}

export interface ImageServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface UnsplashPhoto {
  id: string;
  urls: {
    regular: string;
    small: string;
  };
  description: string | null;
  alt_description: string | null;
  width: number;
  height: number;
  color: string | null;
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

interface UnsplashErrorResponse {
  errors?: string[];
}

const UNSPLASH_API_URL = 'https://api.unsplash.com';

function getUnsplashApiKey(): string {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) {
    throw {
      code: 'MISSING_API_KEY',
      message: 'Unsplash API key not configured. Please set UNSPLASH_ACCESS_KEY environment variable.',
    } as ImageServiceError;
  }
  return apiKey;
}

function mapUnsplashPhoto(photo: UnsplashPhoto): ImageSearchResult {
  return {
    id: photo.id,
    url: photo.urls.regular,
    thumbUrl: photo.urls.small,
    description: photo.description,
    altDescription: photo.alt_description,
    width: photo.width,
    height: photo.height,
    photographer: {
      name: photo.user.name,
      username: photo.user.username,
      portfolioUrl: photo.user.links.html,
    },
    color: photo.color,
  };
}

export async function searchImages(
  query: string,
  page: number = 1,
  perPage: number = 12
): Promise<ImageSearchResponse> {
  // Validate inputs
  if (!query || query.trim().length === 0) {
    throw {
      code: 'INVALID_QUERY',
      message: 'Search query is required',
    } as ImageServiceError;
  }

  if (page < 1) {
    throw {
      code: 'INVALID_PAGE',
      message: 'Page must be at least 1',
    } as ImageServiceError;
  }

  if (perPage < 1 || perPage > 30) {
    throw {
      code: 'INVALID_PER_PAGE',
      message: 'Per page must be between 1 and 30',
    } as ImageServiceError;
  }

  const apiKey = getUnsplashApiKey();

  try {
    const url = new URL(`${UNSPLASH_API_URL}/search/photos`);
    url.searchParams.append('query', query.trim());
    url.searchParams.append('page', String(page));
    url.searchParams.append('per_page', String(perPage));
    url.searchParams.append('orientation', 'landscape'); // Better for featured images

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Client-ID ${apiKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as UnsplashErrorResponse;
      
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

      throw {
        code: 'API_ERROR',
        message: errorData.errors?.[0] || `Unsplash API error: ${response.statusText}`,
        details: { status: response.status },
      } as ImageServiceError;
    }

    const data = await response.json() as UnsplashSearchResponse;

    return {
      results: data.results.map(mapUnsplashPhoto),
      total: data.total,
      totalPages: data.total_pages,
      page,
    };
  } catch (err) {
    // Re-throw known errors
    if ((err as ImageServiceError).code) {
      throw err;
    }

    // Handle network/fetch errors
    throw {
      code: 'NETWORK_ERROR',
      message: `Failed to connect to Unsplash API: ${(err as Error).message}`,
    } as ImageServiceError;
  }
}

export async function getRandomImage(query?: string): Promise<ImageSearchResult> {
  const apiKey = getUnsplashApiKey();

  try {
    const url = new URL(`${UNSPLASH_API_URL}/photos/random`);
    if (query?.trim()) {
      url.searchParams.append('query', query.trim());
    }
    url.searchParams.append('orientation', 'landscape');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Client-ID ${apiKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as UnsplashErrorResponse;
      
      if (response.status === 401) {
        throw {
          code: 'AUTH_ERROR',
          message: 'Invalid Unsplash API key',
        } as ImageServiceError;
      }

      if (response.status === 403) {
        throw {
          code: 'RATE_LIMITED',
          message: 'Unsplash API rate limit exceeded',
        } as ImageServiceError;
      }

      throw {
        code: 'API_ERROR',
        message: errorData.errors?.[0] || `Unsplash API error: ${response.statusText}`,
      } as ImageServiceError;
    }

    const photo = await response.json() as UnsplashPhoto;
    return mapUnsplashPhoto(photo);
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

// Generate attribution HTML for Unsplash images
export function generateAttribution(image: ImageSearchResult): string {
  return `Photo by <a href="${image.photographer.portfolioUrl}?utm_source=autopress&utm_medium=referral">${image.photographer.name}</a> on <a href="https://unsplash.com/?utm_source=autopress&utm_medium=referral">Unsplash</a>`;
}

// Generate markdown attribution
export function generateAttributionMarkdown(image: ImageSearchResult): string {
  return `Photo by [${image.photographer.name}](${image.photographer.portfolioUrl}?utm_source=autopress&utm_medium=referral) on [Unsplash](https://unsplash.com/?utm_source=autopress&utm_medium=referral)`;
}
