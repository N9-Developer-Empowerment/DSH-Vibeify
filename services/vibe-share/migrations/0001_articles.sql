CREATE TABLE IF NOT EXISTS articles (
  slug TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  delete_token_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS articles_expires_at ON articles (expires_at);
