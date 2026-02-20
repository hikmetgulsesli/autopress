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
  adsense_status?: 'approved' | 'pending' | 'rejected' | 'not_configured';
  api_credentials?: {
    wordpress?: {
      site_url: string;
      username: string;
      app_password: string;
    };
    blogger?: {
      client_id: string;
      client_secret: string;
      oauth_token?: string;
      oauth_refresh_token?: string;
      oauth_expires_at?: string;
    };
  };
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

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'UNAUTHORIZED_ACCESS'
  | 'RATE_LIMIT_HIT';

export interface SecurityEventDetails {
  reason?: string;
  [key: string]: unknown;
}

export interface AuditLog {
  id: number;
  event_type: SecurityEventType;
  user_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  details: SecurityEventDetails | null;
  created_at: string;
}

export interface SecurityStats {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  uniqueIps: number;
  uniqueUsers: number;
}

export interface RateLimitStats {
  windowMs: number;
  maxRequests: number;
  currentRequests: number;
  remainingRequests: number;
  resetTime: string;
}

export interface SecurityHeadersStatus {
  contentSecurityPolicy: boolean;
  hsts: boolean;
  frameguard: boolean;
  noSniff: boolean;
  referrerPolicy: boolean;
  allEnabled: boolean;
}

export interface LockedAccount {
  id: number;
  email: string;
  failed_login_attempts: number;
  locked_until: string;
}

export interface UpdateProfileRequest {
  name: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  notifyOnPublishSuccess: boolean;
  notifyOnPublishFailed: boolean;
  notifyOnTrendingTopic: boolean;
}

export interface ApiKeys {
  openai_api_key?: string;
  unsplash_api_key?: string;
  google_trends_api_key?: string;
  search_console_client_id?: string;
  search_console_client_secret?: string;
  search_console_refresh_token?: string;
}
