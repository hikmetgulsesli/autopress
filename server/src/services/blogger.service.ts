import { google, blogger_v3 } from 'googleapis';
import { logger } from '../utils/logger';

export interface BloggerCredentials {
  blogId: string;
  clientEmail: string;
  privateKey: string;
}

export interface BloggerPost {
  title: string;
  content: string;
  labels?: string[];
}

export interface BloggerPostResponse {
  id: string;
  url: string;
  status: string;
  title: string;
  published: string;
}

export class BloggerError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'BloggerError';
  }
}

export class BloggerService {
  private credentials: BloggerCredentials;
  private blogger: blogger_v3.Blogger;

  constructor(credentials: BloggerCredentials) {
    this.credentials = credentials;
    
    const auth = new google.auth.JWT(
      credentials.clientEmail,
      undefined,
      credentials.privateKey.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/blogger']
    );
    
    this.blogger = google.blogger({ version: 'v3', auth });
  }

  async publishPost(post: BloggerPost): Promise<BloggerPostResponse> {
    try {
      const response = await this.blogger.posts.insert({
        blogId: this.credentials.blogId,
        requestBody: {
          title: post.title,
          content: post.content,
          labels: post.labels,
        },
      });

      const data = response.data;
      
      logger.info(`Blogger post published: ${data.id} - ${data.url}`);
      
      return {
        id: data.id || '',
        url: data.url || '',
        status: data.status || 'live',
        title: data.title || post.title,
        published: data.published || new Date().toISOString(),
      };
    } catch (error: any) {
      const statusCode = error.code || 500;
      const message = error.message || 'Blogger publish failed';
      
      logger.error(`Blogger publish failed: ${message}`, { statusCode, blogId: this.credentials.blogId });
      
      throw new BloggerError(message, statusCode, 'BLOGGER_PUBLISH_ERROR');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.blogger.blogs.get({
        blogId: this.credentials.blogId,
      });
      return true;
    } catch (error) {
      logger.error('Blogger connection test failed', { error });
      return false;
    }
  }
}

export function createBloggerService(credentials: BloggerCredentials): BloggerService {
  return new BloggerService(credentials);
}
