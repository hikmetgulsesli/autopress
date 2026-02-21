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

// Get WordPress config from environment or database
const getWordPressConfig = (): WordPressConfig => {
  const siteUrl = process.env.WORDPRESS_SITE_URL;
  const username = process.env.WORDPRESS_USERNAME;
  const applicationPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!siteUrl || !username || !applicationPassword) {
    throw {
      code: 'MISSING_CONFIG',
      message: 'WordPress configuration not found. Set WORDPRESS_SITE_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD environment variables.',
    } as WordPressServiceError;
  }

  return { siteUrl, username, applicationPassword };
};

// Log publish history to database
const logPublishHistory = async (
  articleId: number,
  wordpressId: number,
  wordpressUrl: string,
  status: string
): Promise<void> => {
  try {
    await query(
      `INSERT INTO publish_history (article_id, wordpress_id, wordpress_url, status, published_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [articleId, wordpressId, wordpressUrl, status]
    );
  } catch (err) {
    console.error('Failed to log publish history:', err);
  }
};

// Main service functions

/**
 * Publish a post with custom WordPress config (for scheduler)
 */
export const publishPostWithConfig = async (
  articleId: number,
  post: WordPressPost,
  config: WordPressConfig
): Promise<WordPressPublishResult> => {
  try {
    const wp = new WordPressClient(config);

    const result = await wp.createPost(post);

    return {
      success: true,
      wordpressId: result.id,
      wordpressUrl: result.link,
      status: post.status,
    };
  } catch (error) {
    console.error('Failed to publish post with custom WordPress config:', {
      articleId,
      siteUrl: config.siteUrl,
      error,
    });
    throw error;
  }
};

export const publishPost = async (
  articleId: number,
  post: WordPressPost
): Promise<WordPressPublishResult> => {
  const config = getWordPressConfig();
  const wp = new WordPressClient(config);

  const result = await wp.createPost(post);
  
  await logPublishHistory(articleId, result.id, result.link, post.status);

  return {
    success: true,
    wordpressId: result.id,
    wordpressUrl: result.link,
    status: post.status,
  };
};

export const updatePost = async (
  wordpressId: number,
  post: Partial<WordPressPost>
): Promise<WordPressPublishResult> => {
  const config = getWordPressConfig();
  const wp = new WordPressClient(config);

  const result = await wp.updatePost(wordpressId, post);

  return {
    success: true,
    wordpressId: result.id,
    wordpressUrl: result.link,
    status: post.status || 'publish',
  };
};

export const deletePost = async (wordpressId: number): Promise<boolean> => {
  const config = getWordPressConfig();
  const wp = new WordPressClient(config);

  return wp.deletePost(wordpressId);
};

export const publishPage = async (page: WordPressPage): Promise<WordPressPublishResult> => {
  const config = getWordPressConfig();
  const wp = new WordPressClient(config);

  const result = await wp.createPage(page);

  return {
    success: true,
    wordpressId: result.id,
    wordpressUrl: result.link,
    status: page.status,
  };
};

export const uploadMedia = async (imageUrl: string, title?: string): Promise<WordPressMedia> => {
  const config = getWordPressConfig();
  const wp = new WordPressClient(config);

  return wp.uploadMedia(imageUrl, title);
};

export const getCategories = async (): Promise<Array<{ id: number; name: string }>> => {
  const config = getWordPressConfig();
  const wp = new WordPressClient(config);

  return wp.getCategories();
};

export const getTags = async (): Promise<Array<{ id: number; name: string }>> => {
  const config = getWordPressConfig();
  const wp = new WordPressClient(config);

  return wp.getTags();
};

// Test connection to WordPress site
export const testConnection = async (config: WordPressConfig): Promise<{ success: boolean; message: string }> => {
  try {
    const wp = new WordPressClient(config);
    // Try to fetch categories as a lightweight test
    await wp.getCategories();
    return { success: true, message: 'WordPress connection successful' };
  } catch (err: any) {
    if (err.code === 'AUTH_ERROR') {
      return { success: false, message: 'Invalid WordPress credentials' };
    }
    if (err.code === 'MISSING_CONFIG' || err.code === 'MISSING_AUTH') {
      return { success: false, message: err.message };
    }
    return { success: false, message: `Connection failed: ${err.message || 'Unknown error'}` };
  }
};
