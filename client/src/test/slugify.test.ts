import { describe, it, expect } from 'vitest';
import { slugify, generateSlug } from '../utils/slugify';

describe('slugify', () => {
  it('converts text to lowercase', () => {
    expect(slugify('HELLO WORLD')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world test')).toBe('hello-world-test');
  });

  it('removes special characters', () => {
    expect(slugify('hello@world#test')).toBe('helloworldtest');
  });

  it('handles Turkish characters', () => {
    expect(slugify('Türkçe Başlık')).toBe('turkce-baslk');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('handles numbers', () => {
    expect(slugify('Article 123 Test')).toBe('article-123-test');
  });
});

describe('generateSlug', () => {
  it('generates a slug with random suffix', () => {
    const slug = generateSlug('Test Title');
    expect(slug.startsWith('test-title-')).toBe(true);
  });

  it('handles empty title', () => {
    const slug = generateSlug('');
    expect(slug.startsWith('post-')).toBe(true);
  });
});
