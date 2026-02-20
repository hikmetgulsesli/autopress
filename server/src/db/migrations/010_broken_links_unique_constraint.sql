-- Migration: Add unique constraint on broken_links (article_id, url)
-- This fixes the ON CONFLICT issue in bulkseo.service.ts

-- Add unique constraint on (article_id, url) to prevent duplicate broken links
ALTER TABLE broken_links 
ADD CONSTRAINT IF NOT EXISTS unique_broken_link_article_url 
UNIQUE (article_id, url);

-- Add index for faster lookups on the unique constraint columns
CREATE INDEX IF NOT EXISTS idx_broken_links_article_url ON broken_links(article_id, url);
