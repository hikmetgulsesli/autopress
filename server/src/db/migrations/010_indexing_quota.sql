-- Indexing Quota Tracking Table
-- Tracks daily submissions for Google Indexing API
-- Limit: 200 URL notifications per day per site

CREATE TABLE IF NOT EXISTS indexing_quota (
  id SERIAL PRIMARY KEY,
  site_url VARCHAR(500) NOT NULL DEFAULT 'default',
  submissions_count INTEGER DEFAULT 0,
  submissions_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_url, submissions_date)
);

-- Index for efficient quota lookups
CREATE INDEX IF NOT EXISTS idx_indexing_quota_date ON indexing_quota(submissions_date);
CREATE INDEX IF NOT EXISTS idx_indexing_quota_site_date ON indexing_quota(site_url, submissions_date);
