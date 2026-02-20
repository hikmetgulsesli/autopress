export interface Article {
  id: number;
  site_id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'review' | 'scheduled' | 'published';
  language: string;
  seo_score: number;
  meta_title: string;
  meta_description: string;
  featured_image_url: string;
  word_count: number;
  reading_time: number;
  ai_model: string;
  source_trend_id: number;
  published_url: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  site_name?: string;
}

export interface Trend {
  id: number;
  topic: string;
  score: number;
  source: string;
  language: string;
  region: string;
  raw_data: any;
  checked_at: string;
}

export interface Keyword {
  id: number;
  keyword: string;
  language: string;
  search_volume: number;
  competition: number;
  cpc: number;
  trend_score: number;
  last_checked: string;
}

export interface Site {
  id: number;
  name: string;
  domain: string;
  platform: 'wordpress' | 'blogger';
  platform_id: string;
  language: string;
  niche: string;
  is_active: boolean;
}

export interface PublishHistory {
  id: number;
  article_id: number;
  site_id: number;
  wordpress_id?: number;
  wordpress_url?: string;
  platform: 'wordpress' | 'blogger';
  platform_post_id: string;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  published_at: string;
  article_title?: string;
  site_name?: string;
}

export interface Schedule {
  id: number;
  site_id: number;
  day_of_week: number;
  publish_time: string;
  timezone: string;
  is_active: boolean;
  site_name?: string;
}

export interface PublishQueueItem {
  id: number;
  site_id: number;
  title: string;
  slug: string;
  excerpt: string;
  status: 'scheduled' | 'pending' | 'publishing';
  platform: 'wordpress' | 'blogger';
  scheduled_at: string;
  site_name?: string;
}

export interface ImageSearchResult {
  id: string;
  url: string;
  thumbUrl: string;
  description: string | null;
  altDescription: string | null;
  width: number;
  height: number;
  photographer: {
    name: string;
    username: string;
    portfolioUrl: string;
  };
  color: string | null;
}

export interface ImageSearchMeta {
  total: number;
  totalPages: number;
  page: number;
}

// ============================================================================
// Notification Settings Types
// ============================================================================

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  notifyOnPublishSuccess: boolean;
  notifyOnPublishFailed: boolean;
  notifyOnTrendingTopic: boolean;
}

export interface NotificationSettingsResponse {
  emailEnabled: boolean;
  pushEnabled: boolean;
  notifyOnPublishSuccess: boolean;
  notifyOnPublishFailed: boolean;
  notifyOnTrendingTopic: boolean;
}
