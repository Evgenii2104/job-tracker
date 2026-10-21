-- Day 1: базовая схема (users, jobs, applications)

CREATE TABLE IF NOT EXISTS users (
  id    SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  company    TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  job_id     INTEGER NOT NULL REFERENCES jobs(id),
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
