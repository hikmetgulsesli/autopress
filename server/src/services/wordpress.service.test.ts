import { describe, it, expect, beforeEach } from 'vitest';
import { publishPost, updatePost, deletePost, publishPage, uploadMedia, getCategories, getTags } from '../services/wordpress.service';

describe('WordPressService', () => {
  beforeEach(() => {
    delete process.env.WORDPRESS_SITE_URL;
    delete process.env.WORDPRESS_USERNAME;
    delete process.env.WORDPRESS_APP_PASSWORD;
  });

  describe('Configuration Validation', () => {
    it('should reject when WordPress is not configured', async () => {
      // Without config, all functions should throw MISSING_CONFIG error
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        updatePost(1, { title: 'Test' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        deletePost(1)
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        publishPage({ title: 'Test', content: 'Content', status: 'publish' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        uploadMedia('https://example.com/image.jpg')
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        getCategories()
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });

      await expect(
        getTags()
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });
    });

    it('should require site URL', async () => {
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
      
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });
    });

    it('should require username', async () => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
      
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });
    });

    it('should require application password', async () => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'publish' })
      ).rejects.toMatchObject({ code: 'MISSING_CONFIG' });
    });
  });

  describe('Valid Configuration', () => {
    beforeEach(() => {
      process.env.WORDPRESS_SITE_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'testuser';
      process.env.WORDPRESS_APP_PASSWORD = 'testpass';
    });

    it('should accept publish with all post fields', async () => {
      // With config set, should get API error (not config error)
      await expect(
        publishPost(1, {
          title: 'Test Post',
          content: '<p>Test content</p>',
          excerpt: 'Test excerpt',
          slug: 'test-post',
          status: 'publish',
          categories: [1, 2],
          tags: [3, 4],
        })
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('should accept draft status', async () => {
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'draft' })
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('should accept future status', async () => {
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'future' })
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('should accept private status', async () => {
      await expect(
        publishPost(1, { title: 'Test', content: 'Content', status: 'private' })
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });
});
