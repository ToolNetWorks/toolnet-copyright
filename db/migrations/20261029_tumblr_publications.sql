-- Publication is a real-time external action. A claimed source date must never
-- be written as a fabricated Tumblr creation/verification time.
CREATE TABLE IF NOT EXISTS tumblr_publications (
  asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE RESTRICT,
  blog TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('publishing', 'published', 'failed', 'uncertain')),
  tumblr_post_id TEXT,
  tumblr_url TEXT,
  last_error TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tumblr_publications_status ON tumblr_publications(status, requested_at DESC);
