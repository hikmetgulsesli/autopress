-- Fix broken_links unique constraint for proper ON CONFLICT handling
-- Task 4: Change ON CONFLICT (id) -> ON CONFLICT (article_id, url)

-- Add unique constraint on (article_id, url)
ALTER TABLE broken_links ADD CONSTRAINT broken_links_article_url_unique UNIQUE (article_id, url);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_broken_links_article_url ON broken_links(article_id, url);
