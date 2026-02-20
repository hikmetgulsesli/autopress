import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

export interface WordPressCredentials {
  url: string;
  username: string;
  password: string;
}

export interface WordPressPost {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
  slug?: string;
  featured_media?: number;
  categories?: number[];
  tags?: number[];
  meta?: Record<string, string>;
}

export interface WordPressPostResponse {
  id: number;
  link: string;
  status: string;
  title: { rendered: string };
  content: { rendered: string };
  date: string;
}

export class WordPressError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'WordPressError';
  }
}

export class WordPressService {
  private credentials: WordPressCredentials;

  constructor(credentials: WordPressCredentials) {
    this.credentials = credentials;
  }

  private getAuthHeader(): string {
    const { username, password } = this.credentials;
    return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  private getApiUrl(endpoint: string): string {
    const baseUrl = this.credentials.url.replace(/\/$/, '');
    return `${baseUrl}/wp-json/wp/v2${endpoint}`;
  }

  async publishPost(post: WordPressPost): Promise<WordPressPostResponse> {
    try {
      const response = await axios.post<WordPressPostResponse>(
        this.getApiUrl('/posts'),
        {
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          status: post.status || 'publish',
          slug: post.slug,
          featured_media: post.featured_media,
          categories: post.categories,
          tags: post.tags,
          meta: post.meta,
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      logger.info(`WordPress post published: ${response.data.id} - ${response.data.link}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status || 500;
      const errorData = axiosError.response?.data as any;
      const message = errorData?.message || axiosError.message || 'WordPress publish failed';
      
      logger.error(`WordPress publish failed: ${message}`, { statusCode, url: this.credentials.url });
      
      throw new WordPressError(message, statusCode, 'WORDPRESS_PUBLISH_ERROR');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(this.getApiUrl('/posts'), {
        headers: { Authorization: this.getAuthHeader() },
        timeout: 10000,
      });
      return response.status === 200;
    } catch (error) {
      logger.error('WordPress connection test failed', { error });
      return false;
    }
  }

  async uploadImage(imageUrl: string): Promise<number | null> {
    try {
      // Download image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const buffer = Buffer.from(imageResponse.data, 'binary');
      const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
      const filename = `featured-image-${Date.now()}.${contentType.split('/')[1] || 'jpg'}`;

      // Upload to WordPress
      const uploadResponse = await axios.post(
        this.getApiUrl('/media'),
        buffer,
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
          timeout: 60000,
        }
      );

      return uploadResponse.data.id;
    } catch (error) {
      logger.error('WordPress image upload failed', { error, imageUrl });
      return null;
    }
  }
}

export function createWordPressService(credentials: WordPressCredentials): WordPressService {
  return new WordPressService(credentials);
}
