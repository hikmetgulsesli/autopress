-- Create publish_queue table for scheduled publishing with status tracking
CREATE TABLE IF NOT EXISTS publish_queue (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  scheduled_timezone VARCHAR(50) DEFAULT 'Europe/Istanbul',
  jitter_minutes INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  published_at TIMESTAMPTZ,
  wordpress_id INTEGER,
  wordpress_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_publish_queue_status ON publish_queue(status);
CREATE INDEX IF NOT EXISTS idx_publish_queue_scheduled_at ON publish_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publish_queue_article_id ON publish_queue(article_id);

-- Create publish_history table if not exists (enhanced version)
CREATE TABLE IF NOT EXISTS publish_history (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
  queue_id INTEGER REFERENCES publish_queue(id) ON DELETE SET NULL,
  platform VARCHAR(20) NOT NULL,
  platform_post_id VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for publish history
CREATE INDEX IF NOT EXISTS idx_publish_history_article_id ON publish_history(article_id);
CREATE INDEX IF NOT EXISTS idx_publish_history_queue_id ON publish_history(queue_id);
CREATE INDEX IF NOT EXISTS idx_publish_history_published_at ON publish_history(published_at);

-- Update schedules table to support publish date/time with timezone
ALTER TABLE schedules 
  ADD COLUMN IF NOT EXISTS publish_date DATE,
  ADD COLUMN IF NOT EXISTS publish_datetime TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Istanbul',
  ADD COLUMN IF NOT EXISTS jitter_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS jitter_minutes INTEGER DEFAULT 15;

-- Create index for schedule queries
CREATE INDEX IF NOT EXISTS idx_schedules_site_id ON schedules(site_id);
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON schedules(is_active);
