-- ToolNet Copyright v0.2: editable OWNER-DECLARED work dates.
-- Applied to the existing Neon database after db/schema.sql.
-- Technical upload/verification/publication timestamps are NOT modified.
-- PostgreSQL executes this migration atomically when invoked with psql -1.

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS original_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS copyright_effective_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_claim_source TEXT,
  ADD COLUMN IF NOT EXISTS time_claim_reference TEXT,
  ADD COLUMN IF NOT EXISTS time_claim_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_claim_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS asset_time_claim_versions (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  original_created_at TIMESTAMPTZ,
  original_captured_at TIMESTAMPTZ,
  original_published_at TIMESTAMPTZ,
  copyright_effective_at TIMESTAMPTZ,
  claim_source TEXT NOT NULL,
  claim_reference TEXT NOT NULL DEFAULT '',
  correction_reason TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  snapshot_sha256 CHAR(64) NOT NULL,
  PRIMARY KEY (asset_id, version)
);
CREATE INDEX IF NOT EXISTS idx_asset_time_claim_versions_date
  ON asset_time_claim_versions (asset_id, recorded_at DESC);

DROP TRIGGER IF EXISTS time_claim_versions_immutable ON asset_time_claim_versions;
CREATE TRIGGER time_claim_versions_immutable
  BEFORE UPDATE OR DELETE ON asset_time_claim_versions
  FOR EACH ROW EXECUTE FUNCTION forbid_evidence_mutation();

-- One database transaction handles the correction and append-only audit event.
-- The generated snapshot digest is a hash of the recorded claim, not proof of
-- copyright ownership or evidence that the claimed date was independently verified.
CREATE OR REPLACE FUNCTION update_asset_time_claim(
  p_asset_id UUID,
  p_claim JSONB,
  p_expected_version INTEGER,
  p_reason TEXT
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  a assets%ROWTYPE;
  v_version INTEGER;
  v_recorded TIMESTAMPTZ := clock_timestamp();
  v_created TIMESTAMPTZ;
  v_captured TIMESTAMPTZ;
  v_published TIMESTAMPTZ;
  v_rights TIMESTAMPTZ;
  v_source TEXT;
  v_reference TEXT;
  v_snapshot JSONB;
  v_old JSONB;
  v_sha CHAR(64);
BEGIN
  IF p_claim IS NULL OR jsonb_typeof(p_claim) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_CLAIM' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'INVALID_CORRECTION_REASON' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO a FROM assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ASSET_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF a.time_claim_version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = '40001';
  END IF;

  v_created   := (p_claim->>'original_created_at')::timestamptz;
  v_captured  := (p_claim->>'original_captured_at')::timestamptz;
  v_published := (p_claim->>'original_published_at')::timestamptz;
  v_rights    := (p_claim->>'copyright_effective_at')::timestamptz;
  v_source := btrim(coalesce(p_claim->>'time_claim_source', ''));
  v_reference := btrim(coalesce(p_claim->>'time_claim_reference', ''));

  IF v_source NOT IN ('owner_declaration','exif','raw_file','project_file','contract','publication_url','other')
     OR length(v_reference) > 2048 THEN
    RAISE EXCEPTION 'INVALID_CLAIM_SOURCE' USING ERRCODE = '22023';
  END IF;
  IF v_created > v_recorded OR v_captured > v_recorded OR v_published > v_recorded THEN
    RAISE EXCEPTION 'CLAIM_DATE_IN_FUTURE' USING ERRCODE = '22023';
  END IF;
  IF v_created < '1800-01-01'::timestamptz OR v_captured < '1800-01-01'::timestamptz
     OR v_published < '1800-01-01'::timestamptz OR v_rights < '1800-01-01'::timestamptz THEN
    RAISE EXCEPTION 'CLAIM_DATE_OUT_OF_RANGE' USING ERRCODE = '22023';
  END IF;
  IF v_created IS NOT NULL AND v_published IS NOT NULL AND v_published < v_created THEN
    RAISE EXCEPTION 'PUBLICATION_BEFORE_CREATION' USING ERRCODE = '22023';
  END IF;

  v_version := a.time_claim_version + 1;
  v_old := jsonb_build_object(
    'original_created_at', a.original_created_at,
    'original_captured_at', a.original_captured_at,
    'original_published_at', a.original_published_at,
    'copyright_effective_at', a.copyright_effective_at,
    'time_claim_source', a.time_claim_source,
    'time_claim_reference', a.time_claim_reference,
    'time_claim_version', a.time_claim_version
  );
  v_snapshot := jsonb_build_object(
    'asset_id', p_asset_id,
    'revision', v_version,
    'original_created_at', v_created,
    'original_captured_at', v_captured,
    'original_published_at', v_published,
    'copyright_effective_at', v_rights,
    'time_claim_source', v_source,
    'time_claim_reference', v_reference,
    'recorded_at', v_recorded
  );
  v_sha := encode(digest(v_snapshot::text, 'sha256'), 'hex');

  UPDATE assets SET
    original_created_at = v_created,
    original_captured_at = v_captured,
    original_published_at = v_published,
    copyright_effective_at = v_rights,
    time_claim_source = v_source,
    time_claim_reference = v_reference,
    time_claim_version = v_version,
    time_claim_updated_at = v_recorded
  WHERE id = p_asset_id;

  INSERT INTO asset_time_claim_versions (
    asset_id,version,original_created_at,original_captured_at,
    original_published_at,copyright_effective_at,claim_source,
    claim_reference,correction_reason,recorded_at,snapshot_sha256
  ) VALUES (
    p_asset_id,v_version,v_created,v_captured,
    v_published,v_rights,v_source,v_reference,btrim(p_reason),v_recorded,v_sha
  );

  PERFORM append_evidence_event(
    p_asset_id,
    'time_claim_revised',
    jsonb_build_object('previous_claim',v_old,'new_claim',v_snapshot,
                       'correction_reason',btrim(p_reason),'snapshot_sha256',v_sha)
  );

  RETURN jsonb_build_object('version',v_version,'snapshot_sha256',v_sha,
                            'recorded_at',v_recorded);
END;
$$;
