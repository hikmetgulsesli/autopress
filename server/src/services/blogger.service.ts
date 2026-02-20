import { google, blogger_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../db/connection';

// Types
export interface Blog {
  id: string;
  name: string;
  description: string;
  url: string;
  published: string;
  updated: string;
}

export interface Post {
  id: string;
  blogId: string;
  title: string;
  content: string;
  url: string;
  published: string;
  updated: string;
  labels?: string[];
}

export interface Page {
  id: string;
  blogId: string;
  title: string;
  content: string;
  url: string;
  published: string;
  updated: string;
}

export interface PublishOptions {
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

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
}

export interface BloggerServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Blogger API client manager
class BloggerClient {
  private oauth2Client: OAuth2Client;
  private blogger: blogger_v3.Blogger;
  private credentials: OAuthCredentials;

  constructor(credentials: OAuthCredentials) {
    this.validateCredentials(credentials);
    this.credentials = credentials;

    this.oauth2Client = new OAuth2Client(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    // Set credentials if available
    if (credentials.accessToken) {
      this.oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expiry_date: credentials.expiryDate,
      });
    }

    this.blogger = google.blogger({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  private validateCredentials(credentials: OAuthCredentials): void {
    if (!credentials.clientId) {
      throw {
        code: 'MISSING_CLIENT_ID',
        message: 'Google OAuth client ID is required',
      } as BloggerServiceError;
    }

    if (!credentials.clientSecret) {
      throw {
        code: 'MISSING_CLIENT_SECRET',
        message: 'Google OAuth client secret is required',
      } as BloggerServiceError;
    }

    if (!credentials.redirectUri) {
      throw {
        code: 'MISSING_REDIRECT_URI',
        message: 'Google OAuth redirect URI is required',
      } as BloggerServiceError;
    }
  }

  // Get authorization URL for OAuth flow
  getAuthUrl(scopes: string[] = ['https://www.googleapis.com/auth/blogger']): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  // Exchange authorization code for tokens
  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiryDate: number;
  }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw {
          code: 'TOKEN_EXCHANGE_FAILED',
          message: 'Failed to obtain access token',
        } as BloggerServiceError;
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
      };
    } catch (err) {
      const error = err as { message?: string };
      throw {
        code: 'AUTH_EXCHANGE_ERROR',
        message: `Failed to exchange authorization code: ${error.message || 'Unknown error'}`,
      } as BloggerServiceError;
    }
  }

  // Refresh access token if expired
  async refreshTokenIfNeeded(): Promise<void> {
    const expiryDate = this.oauth2Client.credentials.expiry_date;
    
    // Refresh if token expires in less than 5 minutes
    if (expiryDate && expiryDate < Date.now() + 5 * 60 * 1000) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
      } catch (err) {
        const error = err as { message?: string };
        throw {
          code: 'TOKEN_REFRESH_FAILED',
          message: `Failed to refresh access token: ${error.message || 'Unknown error'}`,
        } as BloggerServiceError;
      }
    }
  }

  // Get current access token
  getAccessToken(): string | null {
    return this.oauth2Client.credentials.access_token || null;
  }

  // Get the blogger API instance
  getBlogger(): blogger_v3.Blogger {
    return this.blogger;
  }

  // Get the OAuth2 client
  getOAuth2Client(): OAuth2Client {
    return this.oauth2Client;
  }
}

// Map Blogger API blog response to our Blog type
const mapBlog = (blog: blogger_v3.Schema$Blog): Blog => ({
  id: blog.id || '',
  name: blog.name || '',
  description: blog.description || '',
  url: blog.url || '',
  published: blog.published || '',
  updated: blog.updated || '',
});

// Map Blogger API post response to our Post type
const mapPost = (post: blogger_v3.Schema$Post): Post => ({
  id: post.id || '',
  blogId: post.blog?.id || '',
  title: post.title || '',
  content: post.content || '',
  url: post.url || '',
  published: post.published || '',
  updated: post.updated || '',
  labels: post.labels || [],
});

// Map Blogger API page response to our Page type
const mapPage = (page: blogger_v3.Schema$Page): Page => ({
  id: page.id || '',
  blogId: page.blog?.id || '',
  title: page.title || '',
  content: page.content || '',
  url: page.url || '',
  published: page.published || '',
  updated: page.updated || '',
});

// Log publish history to database
async function logPublishHistory(
  articleId: number | null,
  siteId: number | null,
  platform: string,
  platformPostId: string,
  status: 'success' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO publish_history (article_id, site_id, platform, platform_post_id, status, error_message, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [articleId, siteId, platform, platformPostId, status, errorMessage || null]
    );
  } catch (err) {
    console.error('Failed to log publish history:', err);
  }
}

// List all blogs accessible to the authenticated user
export async function listBlogs(credentials: OAuthCredentials): Promise<Blog[]> {
  const client = new BloggerClient(credentials);
  
  // Ensure token is valid
  await client.refreshTokenIfNeeded();

  try {
    const response = await client.getBlogger().blogs.listByUser({
      userId: 'self',
    });

    const blogs = response.data.items || [];
    return blogs.map(mapBlog);
  } catch (err) {
    const error = err as { code?: number; message?: string };
    
    if (error.code === 401) {
      throw {
        code: 'AUTH_ERROR',
        message: 'Invalid or expired Google OAuth credentials',
      } as BloggerServiceError;
    }

    if (error.code === 403) {
      throw {
        code: 'FORBIDDEN',
        message: 'Access denied to Blogger API',
      } as BloggerServiceError;
    }

    throw {
      code: 'API_ERROR',
      message: `Failed to list blogs: ${error.message || 'Unknown error'}`,
    } as BloggerServiceError;
  }
}

// Publish a post to a blog
export async function publishPost(
  credentials: OAuthCredentials,
  options: PublishOptions,
  articleId?: number,
  siteId?: number
): Promise<Post> {
  const { blogId, title, content, labels, isDraft = false } = options;

  // Validate inputs
  if (!blogId) {
    throw {
      code: 'MISSING_BLOG_ID',
      message: 'Blog ID is required',
    } as BloggerServiceError;
  }

  if (!title || title.trim().length === 0) {
    throw {
      code: 'MISSING_TITLE',
      message: 'Post title is required',
    } as BloggerServiceError;
  }

  if (!content || content.trim().length === 0) {
    throw {
      code: 'MISSING_CONTENT',
      message: 'Post content is required',
    } as BloggerServiceError;
  }

  const client = new BloggerClient(credentials);
  await client.refreshTokenIfNeeded();

  try {
    const response = await client.getBlogger().posts.insert({
      blogId,
      requestBody: {
        title,
        content,
        labels,
      },
      isDraft,
    });

    const post = mapPost(response.data);

    // Log successful publish
    await logPublishHistory(
      articleId || null,
      siteId || null,
      'blogger',
      post.id,
      'success'
    );

    return post;
  } catch (err) {
    const error = err as { code?: number; message?: string };
    
    if (error.code === 401) {
      const errorMessage = 'Invalid or expired Google OAuth credentials';
      await logPublishHistory(articleId || null, siteId || null, 'blogger', '', 'failed', errorMessage);
      throw {
        code: 'AUTH_ERROR',
        message: errorMessage,
      } as BloggerServiceError;
    }

    if (error.code === 403) {
      const errorMessage = 'Access denied to blog';
      await logPublishHistory(articleId || null, siteId || null, 'blogger', '', 'failed', errorMessage);
      throw {
        code: 'FORBIDDEN',
        message: errorMessage,
      } as BloggerServiceError;
    }

    if (error.code === 404) {
      const errorMessage = 'Blog not found';
      await logPublishHistory(articleId || null, siteId || null, 'blogger', '', 'failed', errorMessage);
      throw {
        code: 'BLOG_NOT_FOUND',
        message: errorMessage,
      } as BloggerServiceError;
    }

    const errorMessage = `Failed to publish post: ${error.message || 'Unknown error'}`;
    await logPublishHistory(articleId || null, siteId || null, 'blogger', '', 'failed', errorMessage);
    
    throw {
      code: 'PUBLISH_ERROR',
      message: errorMessage,
    } as BloggerServiceError;
  }
}

// Publish a page to a blog
export async function publishPage(
  credentials: OAuthCredentials,
  options: PublishPageOptions,
  articleId?: number,
  siteId?: number
): Promise<Page> {
  const { blogId, title, content, isDraft = false } = options;

  // Validate inputs
  if (!blogId) {
    throw {
      code: 'MISSING_BLOG_ID',
      message: 'Blog ID is required',
    } as BloggerServiceError;
  }

  if (!title || title.trim().length === 0) {
    throw {
      code: 'MISSING_TITLE',
      message: 'Page title is required',
    } as BloggerServiceError;
  }

  if (!content || content.trim().length === 0) {
    throw {
      code: 'MISSING_CONTENT',
      message: 'Page content is required',
    } as BloggerServiceError;
  }

  const client = new BloggerClient(credentials);
  await client.refreshTokenIfNeeded();

  try {
    const response = await client.getBlogger().pages.insert({
      blogId,
      requestBody: {
        title,
        content,
      },
      isDraft,
    });

    const page = mapPage(response.data);

    // Log successful publish
    await logPublishHistory(
      articleId || null,
      siteId || null,
      'blogger-page',
      page.id,
      'success'
    );

    return page;
  } catch (err) {
    const error = err as { code?: number; message?: string };
    
    if (error.code === 401) {
      const errorMessage = 'Invalid or expired Google OAuth credentials';
      await logPublishHistory(articleId || null, siteId || null, 'blogger-page', '', 'failed', errorMessage);
      throw {
        code: 'AUTH_ERROR',
        message: errorMessage,
      } as BloggerServiceError;
    }

    if (error.code === 403) {
      const errorMessage = 'Access denied to blog';
      await logPublishHistory(articleId || null, siteId || null, 'blogger-page', '', 'failed', errorMessage);
      throw {
        code: 'FORBIDDEN',
        message: errorMessage,
      } as BloggerServiceError;
    }

    if (error.code === 404) {
      const errorMessage = 'Blog not found';
      await logPublishHistory(articleId || null, siteId || null, 'blogger-page', '', 'failed', errorMessage);
      throw {
        code: 'BLOG_NOT_FOUND',
        message: errorMessage,
      } as BloggerServiceError;
    }

    const errorMessage = `Failed to publish page: ${error.message || 'Unknown error'}`;
    await logPublishHistory(articleId || null, siteId || null, 'blogger-page', '', 'failed', errorMessage);
    
    throw {
      code: 'PUBLISH_ERROR',
      message: errorMessage,
    } as BloggerServiceError;
  }
}

// Get OAuth authorization URL
export function getAuthUrl(credentials: OAuthCredentials): string {
  const client = new BloggerClient(credentials);
  return client.getAuthUrl();
}

// Exchange authorization code for tokens
export async function exchangeCode(
  credentials: OAuthCredentials,
  code: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiryDate: number;
}> {
  const client = new BloggerClient(credentials);
  return client.exchangeCode(code);
}
