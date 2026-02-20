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
  platform_post_id VARCHAR(255),
  platform_post_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate existing data from old columns if they exist
DO $$
BEGIN
  -- Check if old wordpress_id column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'publish_queue' AND column_name = 'wordpress_id') THEN
    -- Copy data from wordpress_id to platform_post_id
    UPDATE publish_queue 
    SET platform_post_id = wordpress_id::VARCHAR 
    WHERE wordpress_id IS NOT NULL AND platform_post_id IS NULL;
  END IF;

  -- Check if old wordpress_url column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'publish_queue' AND column_name = 'wordpress_url') THEN
    -- Copy data from wordpress_url to platform_post_url
    UPDATE publish_queue 
    SET platform_post_url = wordpress_url 
    WHERE wordpress_url IS NOT NULL AND platform_post_url IS NULL;
  END IF;
END $$;

-- Create index for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_publish_queue_status ON publish_queue(status);
CREATE INDEX IF NOT EXISTS idx_publish_queue_scheduled_at ON publish_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publish_queue_article_id ON publish_queue(article_id);

-- Alter existing publish_history table to add new columns if they don't exist
DO $$
BEGIN
  -- Add queue_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'publish_history' AND column_name = 'queue_id') THEN
    ALTER TABLE publish_history ADD COLUMN queue_id INTEGER REFERENCES publish_queue(id) ON DELETE SET NULL;
  END IF;

  -- Add platform column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'publish_history' AND column_name = 'platform') THEN
    ALTER TABLE publish_history ADD COLUMN platform VARCHAR(20) NOT NULL DEFAULT 'wordpress';
  END IF;

  -- Add platform_post_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'publish_history' AND column_name = 'platform_post_id') THEN
    ALTER TABLE publish_history ADD COLUMN platform_post_id VARCHAR(255);
  END IF;

  -- Add attempt_number column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'publish_history' AND column_name = 'attempt_number') THEN
    ALTER TABLE publish_history ADD COLUMN attempt_number INTEGER DEFAULT 1;
  END IF;
END $$;

-- Create indexes for publish history
CREATE INDEX IF NOT EXISTS idx_publish_history_article_id ON publish_history(article_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_publish_history_queue_id') THEN
    CREATE INDEX idx_publish_history_queue_id ON publish_history(queue_id);
  END IF;
END $$;

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
