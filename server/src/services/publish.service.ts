import { query } from '../db/connection';
import { logger } from '../utils/logger';
import {
  WordPressService,
  createWordPressService,
  WordPressError,
} from './wordpress.service';
import {
  BloggerService,
  createBloggerService,
  BloggerError,
} from './blogger.service';

export type Platform = 'wordpress' | 'blogger';

export interface PublishResult {
  success: boolean;
  postId?: string;
  publishedUrl?: string;
  platform: Platform;
  error?: string;
}

export interface Site {
  id: number;
  platform: string;
  api_credentials: any;
  domain: string;
  is_active?: boolean;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  featured_image_url?: string;
  meta_title?: string;
  meta_description?: string;
}

export class PublishError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'PublishError';
  }
}

export class PublishService {
  async publishArticle(
    articleId: number,
    siteId: number
  ): Promise<PublishResult> {
    // Get article
    const articleResult = await query(
      'SELECT * FROM articles WHERE id = $1',
      [articleId]
    );
    
    if (!articleResult.rows[0]) {
      throw new PublishError('Article not found', 'ARTICLE_NOT_FOUND', 404);
    }
    
    const article: Article = articleResult.rows[0];

    // Get site
    const siteResult = await query(
      'SELECT * FROM sites WHERE id = $1',
      [siteId]
    );
    
    if (!siteResult.rows[0]) {
      throw new PublishError('Site not found', 'SITE_NOT_FOUND', 404);
    }
    
    const site: Site = siteResult.rows[0];

    // Check if site is active
    if (site.is_active === false) {
      throw new PublishError('Site is inactive', 'SITE_INACTIVE', 400);
    }

    const platform = site.platform.toLowerCase() as Platform;

    let result: PublishResult;

    try {
      switch (platform) {
        case 'wordpress':
          result = await this.publishToWordPress(article, site);
          break;
        case 'blogger':
          result = await this.publishToBlogger(article, site);
          break;
        default:
          throw new PublishError(
            `Unsupported platform: ${platform}`,
            'UNSUPPORTED_PLATFORM',
            400
          );
      }

      // Update article status and published URL
      if (result.success) {
        await query(
          `UPDATE articles SET 
            status = 'published', 
            published_url = $1, 
            published_at = NOW(),
            updated_at = NOW()
           WHERE id = $2`,
          [result.publishedUrl, articleId]
        );

        // Record in publish history
        await query(
          `INSERT INTO publish_history 
            (article_id, site_id, platform, platform_post_id, status, published_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [articleId, siteId, platform, result.postId, 'success']
        );
      } else {
        // Record failure in publish history
        await query(
          `INSERT INTO publish_history 
            (article_id, site_id, platform, status, error_message, published_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [articleId, siteId, platform, 'failed', result.error]
        );
      }

      return result;
    } catch (error) {
      // Record error in publish history
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await query(
        `INSERT INTO publish_history 
          (article_id, site_id, platform, status, error_message, published_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [articleId, siteId, platform, 'error', errorMessage]
      );

      throw error;
    }
  }

  private async publishToWordPress(
    article: Article,
    site: Site
  ): Promise<PublishResult> {
    const creds = site.api_credentials;
    
    if (!creds?.username || !creds?.password) {
      throw new PublishError(
        'WordPress credentials missing',
        'MISSING_CREDENTIALS',
        400
      );
    }

    const wpService = createWordPressService({
      url: site.domain,
      username: creds.username,
      password: creds.password,
    });

    try {
      let featuredMediaId: number | undefined;
      
      // Upload featured image if exists
      if (article.featured_image_url) {
        featuredMediaId = await wpService.uploadImage(article.featured_image_url) || undefined;
      }

      const post = await wpService.publishPost({
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        slug: article.slug,
        status: 'publish',
        featured_media: featuredMediaId,
        meta: {
          _yoast_wpseo_title: article.meta_title || article.title,
          _yoast_wpseo_metadesc: article.meta_description || article.excerpt || '',
        },
      });

      return {
        success: true,
        postId: String(post.id),
        publishedUrl: post.link,
        platform: 'wordpress',
      };
    } catch (error) {
      if (error instanceof WordPressError) {
        return {
          success: false,
          platform: 'wordpress',
          error: error.message,
        };
      }
      throw error;
    }
  }

  private async publishToBlogger(
    article: Article,
    site: Site
  ): Promise<PublishResult> {
    const creds = site.api_credentials;
    
    if (!creds?.clientEmail || !creds?.privateKey || !creds?.blogId) {
      throw new PublishError(
        'Blogger credentials missing',
        'MISSING_CREDENTIALS',
        400
      );
    }

    const bloggerService = createBloggerService({
      blogId: creds.blogId,
      clientEmail: creds.clientEmail,
      privateKey: creds.privateKey,
    });

    try {
      const post = await bloggerService.publishPost({
        title: article.title,
        content: article.content,
        labels: [],
      });

      return {
        success: true,
        postId: post.id,
        publishedUrl: post.url,
        platform: 'blogger',
      };
    } catch (error) {
      if (error instanceof BloggerError) {
        return {
          success: false,
          platform: 'blogger',
          error: error.message,
        };
      }
      throw error;
    }
  }

  async getPublishHistory(articleId: number): Promise<any[]> {
    const result = await query(
      `SELECT ph.*, s.name as site_name 
       FROM publish_history ph 
       JOIN sites s ON ph.site_id = s.id 
       WHERE ph.article_id = $1 
       ORDER BY ph.published_at DESC`,
      [articleId]
    );
    return result.rows;
  }
}

export const publishService = new PublishService();
