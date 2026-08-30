CREATE TABLE IF NOT EXISTS published_visuals (
  visual_key TEXT PRIMARY KEY,
  article_slug TEXT NOT NULL,
  visual_kind TEXT NOT NULL,
  created_at INTEGER NOT NULL
) WITHOUT ROWID;

INSERT OR IGNORE INTO published_visuals (visual_key, article_slug, visual_kind, created_at)
SELECT
  CASE
    WHEN instr(json_extract(snapshot_json, '$.visual.imageUrl'), '?') > 0
      THEN substr(json_extract(snapshot_json, '$.visual.imageUrl'), 1, instr(json_extract(snapshot_json, '$.visual.imageUrl'), '?') - 1)
    ELSE json_extract(snapshot_json, '$.visual.imageUrl')
  END,
  slug,
  coalesce(json_extract(snapshot_json, '$.visual.kind'), 'editorial-image'),
  created_at
FROM articles
WHERE json_extract(snapshot_json, '$.visual.imageUrl') IS NOT NULL;

INSERT OR IGNORE INTO published_visuals (visual_key, article_slug, visual_kind, created_at)
SELECT
  CASE
    WHEN instr(json_extract(inline.value, '$.imageUrl'), '?') > 0
      THEN substr(json_extract(inline.value, '$.imageUrl'), 1, instr(json_extract(inline.value, '$.imageUrl'), '?') - 1)
    ELSE json_extract(inline.value, '$.imageUrl')
  END,
  articles.slug,
  coalesce(json_extract(inline.value, '$.kind'), 'editorial-image'),
  articles.created_at
FROM articles, json_each(articles.snapshot_json, '$.inlineVisuals') AS inline
WHERE json_extract(inline.value, '$.imageUrl') IS NOT NULL;

PRAGMA optimize;
