CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
  role TEXT DEFAULT 'user' 
  has_paid BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS brand_books (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  brand_dna    JSONB NOT NULL,
  palette      JSONB NOT NULL,
  typography   JSONB NOT NULL,
  logo_url     TEXT,
  logo_prompt  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  edits_remaining INT DEFAULT 3,
);

CREATE INDEX IF NOT EXISTS idx_brand_books_user_id ON brand_books(user_id);