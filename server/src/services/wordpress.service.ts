import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { query } from '../db/connection';

// Types
export interface WordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

export interface WordPressPost {
  id?: number;
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  status: 'draft' | 'publish' | 'future' | 'private';
  categories?: number[];
  tags?: number[];
  featuredMedia?: number;
  meta?: Record<string, unknown>;
}

export interface WordPressPage {
  id?: number;
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  status: 'draft' | 'publish' | 'future' | 'private';
  parent?: number;
  meta?: Record<string, unknown>;
}

export interface WordPressMedia {
  id: number;
  source_url: string;
  media_details: {
    sizes: {
      full: { source_url: string };
      medium?: { source_url: string };
      thumbnail?: { source_url: string };
    };
  };
}

export interface WordPressPublishResult {
  success: boolean;
  wordpressId: number;
  wordpressUrl: string;
  status: string;
}

export interface WordPressServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Site credentials interface
interface SiteCredentials {
  wordpress?: {
    siteUrl?: string;
    username?: string;
    applicationPassword?: string;
  };
}

// WordPress API client
class WordPressClient {
  private client: AxiosInstance;

  constructor(config: WordPressConfig) {
    const { siteUrl, username, applicationPassword } = config;
    
    if (!siteUrl) {
      throw {
        code: 'MISSING_CONFIG',
        message: 'WordPress site URL is required',
      } as WordPressServiceError;
    }

    if (!username || !applicationPassword) {
      throw {
        code: 'MISSING_AUTH',
        message: 'WordPress username and application password are required',
      } as WordPressServiceError;
    }

    const baseURL = siteUrl.replace(/\/$/, '') + '/wp-json/wp/v2';
    const credentials = Buffer.from(`${username}:${applicationPassword}`).toString('base64');

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  // Posts
  async createPost(post: WordPressPost): Promise<{ id: number; link: string }> {
    try {
      const response = await this.client.post('/posts', {
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        slug: post.slug,
        status: post.status,
        categories: post.categories || [],
        tags: post.tags || [],
        featured_media: post.featuredMedia,
        meta: post.meta,
      });
      return {
        id: response.data.id,
        link: response.data.link,
      };
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      
      if (error.response?.status === 401) {
        throw {
          code: 'AUTH_ERROR',
          message: 'Invalid WordPress credentials',
        } as WordPressServiceError;
      }

      if (error.response?.status === 403) {
        throw {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to create posts',
        } as WordPressServiceError;
      }

      throw {
        code: 'API_ERROR',
        message: `Failed to create post: ${error.response?.data?.message || error.message || 'Unknown error'}`,
      } as WordPressServiceError;
    }
  }

  async updatePost(id: number, post: Partial<WordPressPost>): Promise<{ id: number; link: string }> {
    try {
      const response = await this.client.post(`/posts/${id}`, {
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        slug: post.slug,
        status: post.status,
        categories: post.categories,
        tags: post.tags,
        featured_media: post.featuredMedia,
        meta: post.meta,
      });
      return {
        id: response.data.id,
        link: response.data.link,
      };
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      
      if (error.response?.status === 404) {
        throw {
          code: 'NOT_FOUND',
          message: `Post ${id} not found`,
        } as WordPressServiceError;
      }

      throw {
        code: 'API_ERROR',
        message: `Failed to update post: ${error.response?.data?.message || error.message || 'Unknown error'}`,
      } as WordPressServiceError;
    }
  }

  async deletePost(id: number): Promise<boolean> {
    try {
      await this.client.delete(`/posts/${id}`, { data: { force: true } });
      return true;
    } catch (err) {
      const error = err as { response?: { status?: number }; message?: string };
      
      if (error.response?.status === 404) {
        return false;
      }

      throw {
        code: 'API_ERROR',
        message: `Failed to delete post: ${error.message || 'Unknown error'}`,
      } as WordPressServiceError;
    }
  }

  // Pages
  async createPage(page: WordPressPage): Promise<{ id: number; link: string }> {
    try {
      const response = await this.client.post('/pages', {
        title: page.title,
        content: page.content,
        excerpt: page.excerpt,
        slug: page.slug,
        status: page.status,
        parent: page.parent,
        meta: page.meta,
      });
      return {
        id: response.data.id,
        link: response.data.link,
      };
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      
      if (error.response?.status === 401) {
        throw {
          code: 'AUTH_ERROR',
          message: 'Invalid WordPress credentials',
        } as WordPressServiceError;
      }

      throw {
        code: 'API_ERROR',
        message: `Failed to create page: ${error.response?.data?.message || error.message || 'Unknown error'}`,
      } as WordPressServiceError;
    }
  }

  async updatePage(id: number, page: Partial<WordPressPage>): Promise<{ id: number; link: string }> {
    try {
      const response = await this.client.post(`/pages/${id}`, {
        title: page.title,
        content: page.content,
        excerpt: page.excerpt,
        slug: page.slug,
        status: page.status,
        parent: page.parent,
        meta: page.meta,
      });
      return {
        id: response.data.id,
        link: response.data.link,
      };
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      
      if (error.response?.status === 404) {
        throw {
          code: 'NOT_FOUND',
          message: `Page ${id} not found`,
        } as WordPressServiceError;
      }

      throw {
        code: 'API_ERROR',
        message: `Failed to update page: ${error.response?.data?.message || error.message || 'Unknown error'}`,
      } as WordPressServiceError;
    }
  }

  // Media
  async uploadMedia(imageUrl: string, title?: string): Promise<WordPressMedia> {
    try {
      // Fetch the image from the URL
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
      const filename = imageUrl.split('/').pop() || 'image.jpg';

      // Upload to WordPress
      const formData = new FormData();
      const blob = new Blob([imageResponse.data], { type: contentType });
      formData.append('file', blob, filename);
      if (title) {
        formData.append('title', title);
      }

      const response = await this.client.post('/media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      
      if (error.response?.status === 401) {
        throw {
          code: 'AUTH_ERROR',
          message: 'Invalid WordPress credentials for media upload',
        } as WordPressServiceError;
      }

      throw {
        code: 'API_ERROR',
        message: `Failed to upload media: ${error.response?.data?.message || error.message || 'Unknown error'}`,
      } as WordPressServiceError;
    }
  }

  // Categories and Tags
  async getCategories(): Promise<Array<{ id: number; name: string }>> {
    try {
      const response = await this.client.get('/categories', { params: { per_page: 100 } });
      return response.data.map((cat: { id: number; name: string }) => ({ id: cat.id, name: cat.name }));
    } catch (err) {
      throw {
        code: 'API_ERROR',
        message: `Failed to fetch categories: ${(err as Error).message}`,
      } as WordPressServiceError;
    }
  }

  async getTags(): Promise<Array<{ id: number; name: string }>> {
    try {
      const response = await this.client.get('/tags', { params: { per_page: 100 } });
      return response.data.map((tag: { id: number; name: string }) => ({ id: tag.id, name: tag.name }));
    } catch (err) {
      throw {
        code: 'API_ERROR',
        message: `Failed to fetch tags: ${(err as Error).message}`,
      } as WordPressServiceError;
    }
  }
}

// Get WordPress config from environment variables (fallback)
const getEnvWordPressConfig = (): WordPressConfig | null => {
  const siteUrl = process.env.WORDPRESS_SITE_URL;
  const username = process.env.WORDPRESS_USERNAME;
  const applicationPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!siteUrl || !username || !applicationPassword) {
    return null;
  }

  return { siteUrl, username, applicationPassword };
};

// Get WordPress config from site record
const getSiteWordPressConfig = async (siteId: number): Promise<WordPressConfig | null> => {
  try {
    const result = await query(
      'SELECT api_credentials FROM sites WHERE id = $1',
      [siteId]
    );

    if (!result.rows[0]?.api_credentials) {
      return null;
    }

    const credentials = result.rows[0].api_credentials as SiteCredentials;
    
    if (!credentials.wordpress) {
      return null;
    }

    const { siteUrl, username, applicationPassword } = credentials.wordpress;

    if (!siteUrl || !username || !applicationPassword) {
      return null;
    }

    return { siteUrl, username, applicationPassword };
  } catch (err) {
    console.error('Failed to fetch site credentials:', err);
    return null;
  }
};

// Get WordPress config - tries site first, falls back to env
const getWordPressConfig = async (siteId?: number): Promise<WordPressConfig> => {
  // If siteId provided, try to get credentials from site
  if (siteId) {
    const siteConfig = await getSiteWordPressConfig(siteId);
    if (siteConfig) {
      return siteConfig;
    }
  }

  // Fall back to environment variables
  const envConfig = getEnvWordPressConfig();
  if (envConfig) {
    return envConfig;
  }

  throw {
    code: 'MISSING_CONFIG',
    message: 'WordPress configuration not found. Set WORDPRESS_SITE_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD environment variables or configure credentials in site settings.',
  } as WordPressServiceError;
};

// Log publish history to database
const logPublishHistory = async (
  articleId: number,
  wordpressId: number,
  wordpressUrl: string,
  status: string,
  siteId?: number
): Promise<void> => {
  try {
    await query(
      `INSERT INTO publish_history (article_id, site_id, wordpress_id, wordpress_url, status, published_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [articleId, siteId || null, wordpressId, wordpressUrl, status]
    );
  } catch (err) {
    console.error('Failed to log publish history:', err);
  }
};

// Main service functions

export const publishPost = async (
  articleId: number,
  post: WordPressPost,
  siteId?: number
): Promise<WordPressPublishResult> => {
  const config = await getWordPressConfig(siteId);
  const wp = new WordPressClient(config);

  const result = await wp.createPost(post);
  
  await logPublishHistory(articleId, result.id, result.link, post.status, siteId);

  return {
    success: true,
    wordpressId: result.id,
    wordpressUrl: result.link,
    status: post.status,
  };
};

export const updatePost = async (
  wordpressId: number,
  post: Partial<WordPressPost>,
  siteId?: number
): Promise<WordPressPublishResult> => {
  const config = await getWordPressConfig(siteId);
  const wp = new WordPressClient(config);

  const result = await wp.updatePost(wordpressId, post);

  return {
    success: true,
    wordpressId: result.id,
    wordpressUrl: result.link,
    status: post.status || 'publish',
  };
};

export const deletePost = async (wordpressId: number, siteId?: number): Promise<boolean> => {
  const config = await getWordPressConfig(siteId);
  const wp = new WordPressClient(config);

  return wp.deletePost(wordpressId);
};

export const publishPage = async (page: WordPressPage, siteId?: number): Promise<WordPressPublishResult> => {
  const config = await getWordPressConfig(siteId);
  const wp = new WordPressClient(config);

  const result = await wp.createPage(page);

  return {
    success: true,
    wordpressId: result.id,
    wordpressUrl: result.link,
    status: page.status,
  };
};

export const uploadMedia = async (imageUrl: string, title?: string, siteId?: number): Promise<WordPressMedia> => {
  const config = await getWordPressConfig(siteId);
  const wp = new WordPressClient(config);

  return wp.uploadMedia(imageUrl, title);
};

export const getCategories = async (siteId?: number): Promise<Array<{ id: number; name: string }>> => {
  const config = await getWordPressConfig(siteId);
  const wp = new WordPressClient(config);

  return wp.getCategories();
};

export const getTags = async (siteId?: number): Promise<Array<{ id: number; name: string }>> => {
  const config = await getWordPressConfig(siteId);
  const wp = new WordPressClient(config);

  return wp.getTags();
};
