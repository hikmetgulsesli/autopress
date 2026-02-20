import { describe, it, expect, beforeEach } from 'vitest';
import { submitUrlForIndexing, checkUrlIndexStatus, batchSubmitUrls } from '../services/searchconsole.service';

describe('SearchConsoleService', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_CLIENT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    delete process.env.GOOGLE_SITE_URL;
  });

  describe('Configuration Validation', () => {
    it('should reject when Google Search Console is not configured', async () => {
      // Without config, should get API_ERROR (since google.auth.JWT is created)
      await expect(
        submitUrlForIndexing({ url: 'https://example.com/post' })
      ).rejects.toMatchObject({ code: 'API_ERROR' });

      await expect(
        checkUrlIndexStatus({ url: 'https://example.com/post' })
      ).rejects.toMatchObject({ code: 'API_ERROR' });
    });
  });

  describe('URL Validation', () => {
    beforeEach(() => {
      process.env.GOOGLE_CLIENT_EMAIL = 'test@example.com';
      process.env.GOOGLE_PRIVATE_KEY = 'test-key';
      process.env.GOOGLE_SITE_URL = 'https://example.com/';
    });

    it('should reject empty URL', async () => {
      await expect(
        submitUrlForIndexing({ url: '' })
      ).rejects.toMatchObject({
        code: 'INVALID_URL',
        message: 'URL is required',
      });
    });

    it('should reject whitespace-only URL', async () => {
      await expect(
        submitUrlForIndexing({ url: '   ' })
      ).rejects.toMatchObject({
        code: 'INVALID_URL',
        message: 'URL is required',
      });
    });

    it('should reject empty URL for status check', async () => {
      await expect(
        checkUrlIndexStatus({ url: '' })
      ).rejects.toMatchObject({
        code: 'INVALID_URL',
        message: 'URL is required',
      });
    });
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      process.env.GOOGLE_CLIENT_EMAIL = 'test@example.com';
      process.env.GOOGLE_PRIVATE_KEY = 'test-key';
      process.env.GOOGLE_SITE_URL = 'https://example.com/';
    });

    it('should reject empty URL array', async () => {
      await expect(
        batchSubmitUrls([])
      ).rejects.toMatchObject({
        code: 'INVALID_URLS',
        message: 'At least one URL is required',
      });
    });

    it('should reject URL array exceeding 100 URLs', async () => {
      const urls = Array.from({ length: 101 }, (_, i) => `https://example.com/post-${i}`);
      
      await expect(
        batchSubmitUrls(urls)
      ).rejects.toMatchObject({
        code: 'BATCH_TOO_LARGE',
        message: 'Maximum 100 URLs can be submitted at once',
      });
    });
  });
});
