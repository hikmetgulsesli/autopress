-- Users (admin panel)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'admin',
  refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites
CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  platform VARCHAR(20) NOT NULL,
  platform_id VARCHAR(255),
  api_credentials JSONB,
  language VARCHAR(10) DEFAULT 'tr',
  niche VARCHAR(100),
  adsense_status VARCHAR(20) DEFAULT 'pending',
  theme_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trends
CREATE TABLE IF NOT EXISTS trends (
  id SERIAL PRIMARY KEY,
  topic VARCHAR(500) NOT NULL,
  score INTEGER DEFAULT 0,
  source VARCHAR(50),
  language VARCHAR(10) DEFAULT 'tr',
  region VARCHAR(10) DEFAULT 'TR',
  raw_data JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keywords
CREATE TABLE IF NOT EXISTS keywords (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'tr',
  search_volume INTEGER,
  competition DECIMAL(3,2),
  cpc DECIMAL(10,2),
  trend_score INTEGER,
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500),
  content TEXT NOT NULL,
  excerpt TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  language VARCHAR(10) DEFAULT 'tr',
  seo_score INTEGER DEFAULT 0,
  meta_title VARCHAR(200),
  meta_description VARCHAR(320),
  featured_image_url TEXT,
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  ai_model VARCHAR(50),
  source_trend_id INTEGER REFERENCES trends(id) ON DELETE SET NULL,
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100),
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
);

-- Article Categories
CREATE TABLE IF NOT EXISTS article_categories (
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, category_id)
);

-- Publish History
CREATE TABLE IF NOT EXISTS publish_history (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
  platform VARCHAR(20),
  platform_post_id VARCHAR(255),
  status VARCHAR(20),
  error_message TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  day_of_week INTEGER,
  publish_time TIME,
  timezone VARCHAR(50) DEFAULT 'Europe/Istanbul',
  is_active BOOLEAN DEFAULT true
);

-- Internal Links
CREATE TABLE IF NOT EXISTS internal_links (
  id SERIAL PRIMARY KEY,
  source_article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  target_article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  anchor_text VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  type VARCHAR(20) DEFAULT 'string'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_site_id ON articles(site_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language);
CREATE INDEX IF NOT EXISTS idx_keywords_language ON keywords(language);
CREATE INDEX IF NOT EXISTS idx_trends_language ON trends(language);
CREATE INDEX IF NOT EXISTS idx_trends_score ON trends(score DESC);
CREATE INDEX IF NOT EXISTS idx_publish_history_article ON publish_history(article_id);
