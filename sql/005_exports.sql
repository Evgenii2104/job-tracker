CREATE TABLE IF NOT EXISTS exports (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  format          TEXT NOT NULL DEFAULT 'csv',
  status          TEXT NOT NULL DEFAULT 'queued',
  progress        INTEGER DEFAULT 0,
  file_path       TEXT,
  idempotency_key TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key)
);
