-- Create publish_history table for WordPress publishing history
CREATE TABLE IF NOT EXISTS publish_history (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL,
  wordpress_id INTEGER NOT NULL,
  wordpress_url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  published_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publish_history_article_id ON publish_history(article_id);
CREATE INDEX IF NOT EXISTS idx_publish_history_wordpress_id ON publish_history(wordpress_id);
