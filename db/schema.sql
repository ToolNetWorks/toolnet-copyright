CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 2 AND 200),
  description TEXT NOT NULL DEFAULT '',
  owner_name TEXT NOT NULL,
  owner_basis TEXT NOT NULL CHECK (owner_basis IN ('original_creator', 'rights_transfer', 'exclusive_license')),
  original_filename TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 262144000),
  staging_key TEXT NOT NULL UNIQUE,
  vault_key TEXT UNIQUE,
  preview_key TEXT,
  preview_sha256 CHAR(64),
  sha256 CHAR(64),
  status TEXT NOT NULL DEFAULT 'upload_pending' CHECK (status IN ('upload_pending','pending_verification','verified','verification_failed')),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  CHECK (is_public = FALSE OR (status='verified' AND sha256 IS NOT NULL AND vault_key IS NOT NULL AND preview_key IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_assets_public ON assets (published_at DESC) WHERE is_public;
CREATE INDEX IF NOT EXISTS idx_assets_created ON assets (created_at DESC);

CREATE TABLE IF NOT EXISTS evidence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash CHAR(64),
  event_hash CHAR(64) NOT NULL UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_evidence_asset ON evidence_events (asset_id, occurred_at, id);

CREATE OR REPLACE FUNCTION forbid_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Evidence events are append-only';
END;
$$;
DROP TRIGGER IF EXISTS evidence_immutable ON evidence_events;
CREATE TRIGGER evidence_immutable BEFORE UPDATE OR DELETE ON evidence_events FOR EACH ROW EXECUTE FUNCTION forbid_evidence_mutation();

CREATE OR REPLACE FUNCTION append_evidence_event(p_asset_id UUID, p_type TEXT, p_details JSONB)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_previous CHAR(64);
  v_hash CHAR(64);
  v_id UUID := gen_random_uuid();
  v_time TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM 1 FROM assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Asset not found'; END IF;
  SELECT event_hash INTO v_previous FROM evidence_events WHERE asset_id = p_asset_id
    ORDER BY occurred_at DESC, id DESC LIMIT 1;
  v_hash := encode(digest(concat_ws('|', p_asset_id::text, v_id::text, p_type,
    coalesce(v_previous::text,''), p_details::text, v_time::text), 'sha256'),'hex');
  INSERT INTO evidence_events(id,asset_id,event_type,details,previous_hash,event_hash,occurred_at)
    VALUES(v_id,p_asset_id,p_type,p_details,v_previous,v_hash,v_time);
  RETURN v_id;
END;
$$;

CREATE TABLE IF NOT EXISTS infringement_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','youtube','tiktok','website','other')),
  reported_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'investigating' CHECK(status IN ('investigating','submitted','resolved','rejected')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cases_created ON infringement_cases (created_at DESC);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash CHAR(64) PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT now()
);
