import { google, blogger_v3, Auth } from 'googleapis';
import { pool } from '../db/connection';
import { logger } from '../utils/logger';

// Types
export interface BloggerCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface BloggerTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

export interface BlogInfo {
  id: string;
  name: string;
  url: string;
  description?: string;
  published?: string;
  updated?: string;
}

export interface PublishPostOptions {
  blogId: string;
  title: string;
  content: string;
  labels?: string[];
  isDraft?: boolean;
}

export interface PublishPageOptions {
  blogId: string;
  title: string;
  content: string;
  isDraft?: boolean;
}

export interface PublishedPost {
  id: string;
  blogId: string;
  title: string;
  url: string;
  published?: string;
  updated?: string;
}

export interface BloggerServiceError {
  code: string;
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

// Error classes
class BloggerError extends Error implements BloggerServiceError {
  code: string;
  statusCode?: number;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode?: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'BloggerError';
  }
}

// OAuth2 client management
let oauth2Client: Auth.OAuth2Client | null = null;

/**
 * Initialize OAuth2 client with credentials
 */
export const initializeOAuth2Client = (credentials: BloggerCredentials): Auth.OAuth2Client => {
  if (!credentials.clientId || !credentials.clientSecret || !credentials.redirectUri) {
    throw new BloggerError(
      'INVALID_CREDENTIALS',
      'Missing required OAuth2 credentials: clientId, clientSecret, redirectUri'
    );
  }

  oauth2Client = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    credentials.redirectUri
  );

  return oauth2Client;
};

/**
 * Get OAuth2 client (throws if not initialized)
 */
const getOAuth2Client = (): Auth.OAuth2Client => {
  if (!oauth2Client) {
    // Try to initialize from environment variables
    const credentials: BloggerCredentials = {
      clientId: process.env.BLOGGER_CLIENT_ID || '',
      clientSecret: process.env.BLOGGER_CLIENT_SECRET || '',
      redirectUri: process.env.BLOGGER_REDIRECT_URI || 'http://localhost:3000/api/auth/blogger/callback',
    };

    if (!credentials.clientId || !credentials.clientSecret) {
      throw new BloggerError(
        'OAUTH_NOT_INITIALIZED',
        'OAuth2 client not initialized. Call initializeOAuth2Client() first or set environment variables.'
      );
    }

    return initializeOAuth2Client(credentials);
  }
  return oauth2Client;
};

/**
 * Generate OAuth2 authorization URL
 */
export const getAuthUrl = (scopes?: string[]): string => {
  const client = getOAuth2Client();
  const defaultScopes = [
    'https://www.googleapis.com/auth/blogger',
    'https://www.googleapis.com/auth/blogger.readonly',
  ];

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes || defaultScopes,
    prompt: 'consent',
  });
};

/**
 * Exchange authorization code for tokens
 */
export const exchangeCodeForTokens = async (code: string): Promise<BloggerTokens> => {
  const client = getOAuth2Client();

  try {
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) {
      throw new BloggerError('TOKEN_ERROR', 'No access token received from Google');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
    };
  } catch (error) {
    const err = error as { message?: string; response?: { data?: { error?: string } } };
    throw new BloggerError(
      'AUTH_CODE_EXCHANGE_FAILED',
      `Failed to exchange authorization code: ${err.message || 'Unknown error'}`,
      400,
      { originalError: err.response?.data?.error }
    );
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<BloggerTokens> => {
  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });

  try {
    const { credentials } = await client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new BloggerError('REFRESH_FAILED', 'No access token received during refresh');
    }

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      expiryDate: credentials.expiry_date || Date.now() + 3600 * 1000,
    };
  } catch (error) {
    const err = error as { message?: string; response?: { status?: number; data?: { error?: string } } };
    throw new BloggerError(
      'TOKEN_REFRESH_FAILED',
      `Failed to refresh access token: ${err.message || 'Unknown error'}`,
      err.response?.status || 401,
      { originalError: err.response?.data?.error }
    );
  }
};

/**
 * Set credentials on OAuth2 client
 */
export const setCredentials = (tokens: BloggerTokens): void => {
  const client = getOAuth2Client();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });
};

/**
 * Create Blogger API client
 */
const createBloggerClient = (): blogger_v3.Blogger => {
  const client = getOAuth2Client();
  return google.blogger({ version: 'v3', auth: client });
};

/**
 * Log publish history to database
 */
const logPublishHistory = async (
  articleId: number | null,
  siteId: number | null,
  platform: string,
  platformPostId: string,
  status: string,
  errorMessage?: string
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO publish_history 
       (article_id, site_id, platform, platform_post_id, status, error_message, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [articleId, siteId, platform, platformPostId, status, errorMessage || null]
    );
    logger.info(`Publish history logged: ${platform} - ${status}`);
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to log publish history:', err.message);
    // Don't throw - logging failure shouldn't break the publish flow
  }
};

/**
 * List all blogs accessible to the authenticated user
 */
export const listBlogs = async (): Promise<BlogInfo[]> => {
  const blogger = createBloggerClient();

  try {
    const response = await blogger.blogs.listByUser({ userId: 'self' });
    const blogs = response.data.items || [];

    return blogs.map((blog) => ({
      id: blog.id || '',
      name: blog.name || '',
      url: blog.url || '',
      description: blog.description || undefined,
      published: blog.published || undefined,
      updated: blog.updated || undefined,
    }));
  } catch (error) {
    const err = error as { message?: string; response?: { status?: number; data?: { error?: { message?: string; code?: number } } } };
    const statusCode = err.response?.status;
    const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error';

    if (statusCode === 401) {
      throw new BloggerError('AUTH_ERROR', 'Authentication failed. Please re-authenticate with Blogger.', 401);
    }

    if (statusCode === 403) {
      throw new BloggerError('FORBIDDEN', 'Access denied to Blogger API.', 403);
    }

    throw new BloggerError(
      'LIST_BLOGS_FAILED',
      `Failed to list blogs: ${errorMessage}`,
      statusCode || 500
    );
  }
};

/**
 * Get a specific blog by ID
 */
export const getBlog = async (blogId: string): Promise<BlogInfo> => {
  const blogger = createBloggerClient();

  try {
    const response = await blogger.blogs.get({ blogId });
    const blog = response.data;

    return {
      id: blog.id || '',
      name: blog.name || '',
      url: blog.url || '',
      description: blog.description || undefined,
      published: blog.published || undefined,
      updated: blog.updated || undefined,
    };
  } catch (error) {
    const err = error as { message?: string; response?: { status?: number; data?: { error?: { message?: string } } } };
    const statusCode = err.response?.status;
    const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error';

    if (statusCode === 404) {
      throw new BloggerError('BLOG_NOT_FOUND', `Blog with ID ${blogId} not found.`, 404);
    }

    throw new BloggerError('GET_BLOG_FAILED', `Failed to get blog: ${errorMessage}`, statusCode || 500);
  }
};

/**
 * Publish a post to a blog
 */
export const publishPost = async (
  options: PublishPostOptions,
  articleId?: number,
  siteId?: number
): Promise<PublishedPost> => {
  const blogger = createBloggerClient();

  try {
    const response = await blogger.posts.insert({
      blogId: options.blogId,
      requestBody: {
        title: options.title,
        content: options.content,
        labels: options.labels || [],
      },
      isDraft: options.isDraft || false,
    });

    const post = response.data;

    // Log successful publish
    await logPublishHistory(
      articleId || null,
      siteId || null,
      'blogger',
      post.id || '',
      options.isDraft ? 'draft' : 'published'
    );

    return {
      id: post.id || '',
      blogId: options.blogId,
      title: post.title || options.title,
      url: post.url || '',
      published: post.published || undefined,
      updated: post.updated || undefined,
    };
  } catch (error) {
    const err = error as { message?: string; response?: { status?: number; data?: { error?: { message?: string; code?: number } } } };
    const statusCode = err.response?.status;
    const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error';

    // Log failed publish
    await logPublishHistory(
      articleId || null,
      siteId || null,
      'blogger',
      '',
      'failed',
      errorMessage
    );

    if (statusCode === 401) {
      throw new BloggerError('AUTH_ERROR', 'Authentication failed. Please re-authenticate with Blogger.', 401);
    }

    if (statusCode === 403) {
      throw new BloggerError('FORBIDDEN', 'Not authorized to publish to this blog.', 403);
    }

    if (statusCode === 404) {
      throw new BloggerError('BLOG_NOT_FOUND', `Blog with ID ${options.blogId} not found.`, 404);
    }

    if (statusCode === 400) {
      throw new BloggerError('INVALID_REQUEST', `Invalid request: ${errorMessage}`, 400);
    }

    throw new BloggerError('PUBLISH_POST_FAILED', `Failed to publish post: ${errorMessage}`, statusCode || 500);
  }
};

/**
 * Publish a page to a blog
 */
export const publishPage = async (
  options: PublishPageOptions,
  articleId?: number,
  siteId?: number
): Promise<PublishedPost> => {
  const blogger = createBloggerClient();

  try {
    const response = await blogger.pages.insert({
      blogId: options.blogId,
      requestBody: {
        title: options.title,
        content: options.content,
      },
      isDraft: options.isDraft || false,
    });

    const page = response.data;

    // Log successful publish
    await logPublishHistory(
      articleId || null,
      siteId || null,
      'blogger_page',
      page.id || '',
      options.isDraft ? 'draft' : 'published'
    );

    return {
      id: page.id || '',
      blogId: options.blogId,
      title: page.title || options.title,
      url: page.url || '',
      published: page.published || undefined,
      updated: page.updated || undefined,
    };
  } catch (error) {
    const err = error as { message?: string; response?: { status?: number; data?: { error?: { message?: string; code?: number } } } };
    const statusCode = err.response?.status;
    const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error';

    // Log failed publish
    await logPublishHistory(
      articleId || null,
      siteId || null,
      'blogger_page',
      '',
      'failed',
      errorMessage
    );

    if (statusCode === 401) {
      throw new BloggerError('AUTH_ERROR', 'Authentication failed. Please re-authenticate with Blogger.', 401);
    }

    if (statusCode === 403) {
      throw new BloggerError('FORBIDDEN', 'Not authorized to publish to this blog.', 403);
    }

    if (statusCode === 404) {
      throw new BloggerError('BLOG_NOT_FOUND', `Blog with ID ${options.blogId} not found.`, 404);
    }

    if (statusCode === 400) {
      throw new BloggerError('INVALID_REQUEST', `Invalid request: ${errorMessage}`, 400);
    }

    throw new BloggerError('PUBLISH_PAGE_FAILED', `Failed to publish page: ${errorMessage}`, statusCode || 500);
  }
};

/**
 * Update an existing post
 */
export const updatePost = async (
  blogId: string,
  postId: string,
  updates: Partial<Omit<PublishPostOptions, 'blogId'>>
): Promise<PublishedPost> => {
  const blogger = createBloggerClient();

  try {
    const response = await blogger.posts.patch({
      blogId,
      postId,
      requestBody: {
        title: updates.title,
        content: updates.content,
        labels: updates.labels,
      },
    });

    const post = response.data;

    return {
      id: post.id || '',
      blogId,
      title: post.title || '',
      url: post.url || '',
      published: post.published || undefined,
      updated: post.updated || undefined,
    };
  } catch (error) {
    const err = error as { message?: string; response?: { status?: number; data?: { error?: { message?: string } } } };
    const statusCode = err.response?.status;
    const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error';

    if (statusCode === 404) {
      throw new BloggerError('POST_NOT_FOUND', `Post with ID ${postId} not found.`, 404);
    }

    throw new BloggerError('UPDATE_POST_FAILED', `Failed to update post: ${errorMessage}`, statusCode || 500);
  }
};

/**
 * Delete a post from a blog
 */
export const deletePost = async (blogId: string, postId: string): Promise<void> => {
  const blogger = createBloggerClient();

  try {
    await blogger.posts.delete({ blogId, postId });
  } catch (error) {
    const err = error as { message?: string; response?: { status?: number; data?: { error?: { message?: string } } } };
    const statusCode = err.response?.status;
    const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error';

    if (statusCode === 404) {
      throw new BloggerError('POST_NOT_FOUND', `Post with ID ${postId} not found.`, 404);
    }

    throw new BloggerError('DELETE_POST_FAILED', `Failed to delete post: ${errorMessage}`, statusCode || 500);
  }
};

/**
 * Get posts from a blog
 */
export const listPosts = async (
  blogId: string,
  options?: { maxResults?: number; status?: 'live' | 'draft' }
): Promise<PublishedPost[]> => {
  const blogger = createBloggerClient();

  try {
    const params: blogger_v3.Params$Resource$Posts$List = {
      blogId,
      maxResults: options?.maxResults || 10,
    };
    
    if (options?.status) {
      params.status = [options.status];
    }

    const response = await blogger.posts.list(params);
    const posts = response.data.items || [];

    return posts.map((post: blogger_v3.Schema$Post) => ({
      id: post.id || '',
      blogId,
      title: post.title || '',
      url: post.url || '',
      published: post.published || undefined,
      updated: post.updated || undefined,
    }));
  } catch (error) {
    const err = error as { message?: string; response?: { status?: number; data?: { error?: { message?: string } } } };
    const statusCode = err.response?.status;
    const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error';

    if (statusCode === 404) {
      throw new BloggerError('BLOG_NOT_FOUND', `Blog with ID ${blogId} not found.`, 404);
    }

    throw new BloggerError('LIST_POSTS_FAILED', `Failed to list posts: ${errorMessage}`, statusCode || 500);
  }
};

/**
 * Test Blogger connection with provided tokens
 */
export const testConnection = async (tokens: BloggerTokens): Promise<{ success: boolean; message: string }> => {
  try {
    setCredentials(tokens);
    // Try to list blogs as a lightweight test
    await listBlogs();
    return { success: true, message: 'Blogger connection successful' };
  } catch (err: any) {
    if (err.code === 'AUTH_ERROR') {
      return { success: false, message: 'Invalid Blogger OAuth tokens. Please re-authenticate.' };
    }
    if (err.code === 'FORBIDDEN') {
      return { success: false, message: 'Access denied to Blogger API' };
    }
    if (err.code === 'OAUTH_NOT_INITIALIZED') {
      return { success: false, message: 'Blogger OAuth not configured' };
    }
    return { success: false, message: err.message || 'Failed to connect to Blogger' };
  }
};
