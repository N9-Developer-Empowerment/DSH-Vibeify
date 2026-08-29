CREATE TABLE IF NOT EXISTS articles (
  slug TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  delete_token_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS articles_expires_at ON articles (expires_at);

CREATE TABLE IF NOT EXISTS daily_publish_limits (
  bucket TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  count INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (bucket, client_hash)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS daily_publish_limits_updated_at
ON daily_publish_limits (updated_at);
