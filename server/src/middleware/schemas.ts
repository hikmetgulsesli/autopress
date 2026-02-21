import { z } from 'zod';

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string().min(1, 'Email gerekli').email('Geçersiz email formatı'),
  password: z.string().min(1, 'Şifre gerekli'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token gerekli'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'İsim gerekli').max(100, 'İsim çok uzun'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre gerekli'),
  newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalıdır'),
});

// ============================================================================
// Sites Schemas
// ============================================================================

export const createSiteSchema = z.object({
  name: z.string().min(1, 'İsim gerekli').max(255, 'İsim çok uzun'),
  domain: z.string().url('Geçersiz domain').optional().or(z.literal('')),
  platform: z.enum(['wordpress', 'blogger'], {
    errorMap: () => ({ message: 'Platform wordpress veya blogger olmalıdır' }),
  }),
  platform_id: z.string().optional(),
  api_credentials: z.record(z.unknown()).optional(),
  language: z.string().max(10).default('tr'),
  niche: z.string().max(255).optional(),
});

export const updateSiteSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().url('Geçersiz domain').optional().or(z.literal('')),
  platform: z.enum(['wordpress', 'blogger']).optional(),
  platform_id: z.string().optional(),
  api_credentials: z.record(z.unknown()).optional(),
  language: z.string().max(10).optional(),
  niche: z.string().max(255).optional(),
  adsense_status: z.string().optional(),
  is_active: z.boolean().optional(),
  theme_config: z.record(z.unknown()).optional(),
});

// ============================================================================
// Articles Schemas
// ============================================================================

export const articleFiltersSchema = z.object({
  site_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).optional(),
  language: z.string().max(10).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createArticleSchema = z.object({
  site_id: z.coerce.number().int().positive().optional(),
  title: z.string().min(1, 'Başlık gerekli').max(500, 'Başlık çok uzun'),
  content: z.string().min(1, 'İçerik gerekli'),
  excerpt: z.string().max(1000).optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).default('draft'),
  language: z.string().max(10).default('tr'),
  meta_title: z.string().max(60).optional(),
  meta_description: z.string().max(160).optional(),
  featured_image_url: z.string().url().optional().or(z.literal('')),
  ai_model: z.string().optional(),
  source_trend_id: z.coerce.number().int().positive().optional(),
});

export const updateArticleSchema = z.object({
  site_id: z.coerce.number().int().positive().optional(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(1000).optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).optional(),
  language: z.string().max(10).optional(),
  meta_title: z.string().max(60).optional(),
  meta_description: z.string().max(160).optional(),
  featured_image_url: z.string().url().optional().or(z.literal('')),
  ai_model: z.string().optional(),
});

// ============================================================================
// Trends Schemas
// ============================================================================

export const trendsFiltersSchema = z.object({
  language: z.string().max(10).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const keywordsFiltersSchema = z.object({
  language: z.string().max(10).optional(),
});

export const searchTrendsSchema = z.object({
  keyword: z.string().min(1, 'Anahtar kelime gerekli').max(200),
  region: z.string().max(10).optional(),
  language: z.string().max(10).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  category: z.coerce.number().int().positive().optional(),
});

export const interestQuerySchema = z.object({
  keyword: z.string().min(1, 'Anahtar kelime gerekli').max(200),
  region: z.string().max(10).optional(),
  language: z.string().max(10).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

export const dailyTrendsQuerySchema = z.object({
  region: z.string().max(10).default('TR'),
  language: z.string().max(10).default('tr'),
});

export const trendingQuerySchema = z.object({
  region: z.string().max(10).default('TR'),
  language: z.string().max(10).default('tr'),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const autocompleteQuerySchema = z.object({
  keyword: z.string().min(1, 'Anahtar kelime gerekli').max(200),
  language: z.string().max(10).default('tr'),
});

// ============================================================================
// RSS Schemas
// ============================================================================

export const createFeedSchema = z.object({
  name: z.string().min(1, 'İsim gerekli').max(255),
  url: z.string().url('Geçersiz URL formatı'),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  language: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
  fetchIntervalMinutes: z.coerce.number().int().positive().max(1440).optional(),
});

export const updateFeedSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url('Geçersiz URL formatı').optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  language: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
  fetchIntervalMinutes: z.coerce.number().int().positive().max(1440).optional(),
});

export const feedIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Geçersiz feed ID').transform(Number),
});

export const testFeedSchema = z.object({
  url: z.string().url('Geçersiz URL formatı'),
});

export const rssItemsQuerySchema = z.object({
  feedId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().positive().default(0),
  processed: z.coerce.boolean().optional(),
  language: z.string().max(10).optional(),
  category: z.string().max(100).optional(),
});

export const rssItemIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Geçersiz item ID').transform(Number),
});

export const trendAnalysisQuerySchema = z.object({
  hours: z.coerce.number().int().positive().max(168).default(24),
  limit: z.coerce.number().int().positive().max(500).default(100),
  language: z.string().max(10).optional(),
});

// ============================================================================
// Publish Schemas
// ============================================================================

export const scheduleArticleSchema = z.object({
  articleId: z.coerce.number().int().positive('Geçerli bir makale ID gerekli'),
  siteId: z.coerce.number().int().positive('Geçerli bir site ID gerekli'),
  platform: z.enum(['wordpress', 'blogger'], {
    errorMap: () => ({ message: 'Platform wordpress veya blogger olmalıdır' }),
  }),
  scheduledAt: z.string().datetime('Geçerli bir tarih gerekli'),
});

export const rescheduleArticleSchema = z.object({
  scheduledAt: z.string().datetime('Geçerli bir tarih gerekli'),
});

export const articleIdParamSchema = z.object({
  articleId: z.string().regex(/^\d+$/, 'Geçersiz makale ID').transform(Number),
});

export const publishNowSchema = z.object({
  articleId: z.coerce.number().int().positive('Geçerli bir makale ID gerekli'),
  siteId: z.coerce.number().int().positive('Geçerli bir site ID gerekli'),
  platform: z.enum(['wordpress', 'blogger'], {
    errorMap: () => ({ message: 'Platform wordpress veya blogger olmalıdır' }),
  }),
});

// ============================================================================
// Settings Schemas
// ============================================================================

export const updateSettingSchema = z.object({
  value: z.unknown(),
  type: z.enum(['string', 'number', 'boolean', 'json']).optional(),
});

export const settingKeyParamSchema = z.object({
  key: z.string().min(1, 'Ayar anahtarı gerekli').max(100),
});

// ============================================================================
// Images Schemas
// ============================================================================

export const imageSearchQuerySchema = z.object({
  q: z.string().min(1, 'Arama sorgusu gerekli'),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(50).default(12),
});

export const randomImageQuerySchema = z.object({
  q: z.string().optional(),
});

// ============================================================================
// Search Console Schemas
// ============================================================================

export const indexUrlSchema = z.object({
  url: z.string().url('Geçerli bir URL gerekli'),
  type: z.enum(['URL_UPDATED', 'URL_DELETED']).default('URL_UPDATED'),
});

export const notifyUrlSchema = z.object({
  url: z.string().url('Geçerli bir URL gerekli'),
});

export const urlQuerySchema = z.object({
  url: z.string().url('Geçerli bir URL gerekli'),
});

export const batchSubmitSchema = z.object({
  urls: z.array(z.string().url('Geçerli bir URL gerekli')).min(1, 'En az bir URL gerekli').max(100, 'En fazla 100 URL'),
  type: z.enum(['URL_UPDATED', 'URL_DELETED']).default('URL_UPDATED'),
});

// ============================================================================
// Bulk SEO Schemas
// ============================================================================

export const bulkAnalyzeSchema = z.object({
  site_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).optional(),
  language: z.string().max(10).optional(),
  min_seo_score: z.coerce.number().int().min(0).max(100).optional(),
  max_seo_score: z.coerce.number().int().min(0).max(100).optional(),
});

export const bulkCheckLinksSchema = z.object({
  site_id: z.coerce.number().int().positive().optional(),
  article_id: z.coerce.number().int().positive().optional(),
});

export const bulkSuggestLinksSchema = z.object({
  site_id: z.coerce.number().int().positive().optional(),
});

export const linkSuggestionsQuerySchema = z.object({
  article_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const suggestionIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Geçersiz öneri ID').transform(Number),
});

export const brokenLinksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  type: z.enum(['internal', 'external']).optional(),
  article_id: z.coerce.number().int().positive().optional(),
});

export const bulkExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  site_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).optional(),
  language: z.string().max(10).optional(),
});

export const bulkJobIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Geçersiz iş ID').transform(Number),
});

export const bulkJobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
