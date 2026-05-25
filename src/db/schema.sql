CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  role          TEXT DEFAULT 'user',
  has_paid      BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS brand_books (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name      TEXT NOT NULL,

  -- core (unchanged shape, kept as separate columns for query convenience)
  brand_dna         JSONB NOT NULL,
  palette           JSONB NOT NULL,
  typography        JSONB NOT NULL,
  logo_url          TEXT,
  logo_prompt       TEXT,

  -- extended brand identity (each section is its own JSONB column so you
  -- can query/index individual sections without parsing a mega blob)
  color_system      JSONB,   -- ColorSystem
  typography_system JSONB,   -- TypographySystem (full scale + web usage)
  logo_guidelines   JSONB,   -- LogoGuidelines
  graphic_elements  JSONB,   -- GraphicElements
  photography_style JSONB,   -- PhotographyStyle
  web_usage_map     JSONB,   -- WebUsageMap
  brand_voice       JSONB,   -- BrandVoice
  asset_guidelines  JSONB,   -- AssetGuidelines

  edits_remaining   INT DEFAULT 3,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_books_user_id ON brand_books(user_id);
CREATE TABLE pending_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE
);