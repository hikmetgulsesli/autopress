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
