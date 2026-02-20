import axios, { AxiosInstance } from 'axios';

// Types
export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string;
}

export interface PexelsSearchResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  total_results: number;
  next_page?: string;
}

export interface ImageSearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  source: 'pexels';
}

export interface ImageSearchOptions {
  query: string;
  page?: number;
  perPage?: number;
}

export interface ImageServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Pexels API client
class PexelsClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      throw {
        code: 'MISSING_API_KEY',
        message: 'Pexels API key not configured',
      } as ImageServiceError;
    }
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.pexels.com/v1',
      headers: {
        Authorization: apiKey,
      },
    });
  }

  async search(query: string, page: number = 1, perPage: number = 20): Promise<PexelsSearchResponse> {
    try {
      const response = await this.client.get<PexelsSearchResponse>('/search', {
        params: { query, page, per_page: perPage },
      });
      return response.data;
    } catch (err) {
      const error = err as { response?: { status?: number }; message?: string };
      if (error.response?.status === 401) {
        throw { code: 'AUTH_ERROR', message: 'Invalid Pexels API key' } as ImageServiceError;
      }
      if (error.response?.status === 429) {
        throw { code: 'RATE_LIMITED', message: 'Pexels API rate limit exceeded' } as ImageServiceError;
      }
      throw { code: 'API_ERROR', message: `Failed to search images: ${error.message || 'Unknown error'}` } as ImageServiceError;
    }
  }
}

const mapPexelsPhoto = (photo: PexelsPhoto): ImageSearchResult => ({
  id: String(photo.id),
  url: photo.src.large,
  thumbnailUrl: photo.src.medium,
  width: photo.width,
  height: photo.height,
  alt: photo.alt || '',
  photographer: photo.photographer,
  photographerUrl: photo.photographer_url,
  source: 'pexels',
});

export const searchImages = async (options: ImageSearchOptions): Promise<ImageSearchResult[]> => {
  const { query, page = 1, perPage = 20 } = options;

  if (!query || query.trim().length === 0) {
    throw { code: 'INVALID_QUERY', message: 'Search query is required' } as ImageServiceError;
  }
  if (page < 1) {
    throw { code: 'INVALID_PAGE', message: 'Page must be greater than 0' } as ImageServiceError;
  }
  if (perPage < 1 || perPage > 80) {
    throw { code: 'INVALID_PER_PAGE', message: 'Per page must be between 1 and 80' } as ImageServiceError;
  }

  const pexels = new PexelsClient();
  const response = await pexels.search(query, page, perPage);
  return response.photos.map(mapPexelsPhoto);
};

export const getImageAttribution = (result: ImageSearchResult): string => {
  if (result.source === 'pexels') {
    return `Photo by ${result.photographer} on Pexels`;
  }
  return `Photo by ${result.photographer}`;
};
