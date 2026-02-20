-- Bulk SEO Analysis Jobs
CREATE TABLE IF NOT EXISTS bulk_seo_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('seo_analysis', 'link_checker', 'internal_links')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  filters JSONB,
  results JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_seo_jobs_status ON bulk_seo_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_seo_jobs_type ON bulk_seo_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_bulk_seo_jobs_created_at ON bulk_seo_jobs(created_at DESC);

-- Broken Links Table
CREATE TABLE IF NOT EXISTS broken_links (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  link_type VARCHAR(20) NOT NULL CHECK (link_type IN ('internal', 'external')),
  status_code INTEGER,
  error_message TEXT,
  anchor_text VARCHAR(255),
  is_broken BOOLEAN DEFAULT true,
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broken_links_article_id ON broken_links(article_id);
CREATE INDEX IF NOT EXISTS idx_broken_links_is_broken ON broken_links(is_broken);
CREATE INDEX IF NOT EXISTS idx_broken_links_type ON broken_links(link_type);

-- Internal Link Suggestions
CREATE TABLE IF NOT EXISTS link_suggestions (
  id SERIAL PRIMARY KEY,
  source_article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  target_article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  suggested_anchor_text VARCHAR(255),
  relevance_score INTEGER DEFAULT 0,
  context_snippet TEXT,
  is_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_article_id, target_article_id)
);

CREATE INDEX IF NOT EXISTS idx_link_suggestions_source ON link_suggestions(source_article_id);
CREATE INDEX IF NOT EXISTS idx_link_suggestions_target ON link_suggestions(target_article_id);
CREATE INDEX IF NOT EXISTS idx_link_suggestions_relevance ON link_suggestions(relevance_score DESC);
