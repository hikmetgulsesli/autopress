-- RSS Feed Sources
CREATE TABLE IF NOT EXISTS rss_feeds (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100),
  language VARCHAR(10) DEFAULT 'tr',
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  fetch_interval_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSS Feed Items (Articles)
CREATE TABLE IF NOT EXISTS rss_items (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER REFERENCES rss_feeds(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  link TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  author VARCHAR(200),
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  guid VARCHAR(500),
  categories TEXT[],
  image_url TEXT,
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  UNIQUE(link)
);

-- RSS Feed Fetch Log
CREATE TABLE IF NOT EXISTS rss_fetch_logs (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER REFERENCES rss_feeds(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, -- success, error, partial
  items_fetched INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  items_duplicate INTEGER DEFAULT 0,
  error_message TEXT,
  fetch_duration_ms INTEGER,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(is_active);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_last_fetched ON rss_feeds(last_fetched_at);
CREATE INDEX IF NOT EXISTS idx_rss_items_feed_id ON rss_items(feed_id);
CREATE INDEX IF NOT EXISTS idx_rss_items_link ON rss_items(link);
CREATE INDEX IF NOT EXISTS idx_rss_items_published_at ON rss_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_items_is_processed ON rss_items(is_processed);
CREATE INDEX IF NOT EXISTS idx_rss_items_fetched_at ON rss_items(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_fetch_logs_feed_id ON rss_fetch_logs(feed_id);
