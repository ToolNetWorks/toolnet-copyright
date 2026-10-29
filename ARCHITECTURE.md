# ToolNet Copyright — architecture and deployment handoff

## Current delivery

- Source package: `ToolNet-Copyright-v0.1.zip`.
- GitHub intended owner: `LBT-AI`; repository name `toolnet-copyright` (not yet created).
- Vercel project created: `toolnet-copyright` (project ID `prj_fiA9AKOowRmcLRjuOhfrqwJcfft2`). Team scope `team_d0hSvPncB7qOWtHVPXE8s2Kj`. Deployment not yet live; team authorization needed for project changes/deployments.
- Cloudflare R2: bucket and credentials not configured, so no real original media stored yet.
- Neon: project/database not created via connector yet; database schema is `db/schema.sql`.

## Module boundaries

- `src/lib/auth.ts`: signed administrator session, same-origin mutation protection and password verification.
- `src/lib/db.ts`: Neon database access, append-only audit event helper.
- `src/lib/r2.ts`: private R2 staging/vault, signed URLs, SHA-256 streaming and image preview processing.
- `src/lib/file-signatures.ts`: first-bytes validation for supported images/videos.
- `src/lib/validation.ts`: Zod input contracts.
- `src/app/api/assets/*`: upload initialization/completion, verification, private originals, video preview and publication.
- `src/app/api/media/*`: publicly accessible previews for published works only.
- `src/app/api/cases`: record suspected infringement metadata privately.
- `src/app/works/*`: public registry pages.
- `src/app/dashboard/*`: private admin tools.

## Main invariant

A public asset must have `status=verified`, non-null `sha256`, `vault_key` and a **separate** `preview_key`. The full-resolution source is never served from the public `/api/media` endpoint.

## Security/evidence limitations to prioritize

- Independently verifiable timestamp and periodic signed chain checkpoints with external storage.
- File version retention/immutability and database backup/point-in-time recovery. A privileged DB or R2 administrator could modify rows/objects.
- Multipart upload and asynchronous worker verification for large video files.
- Full IAM permission separation (staging write vs vault object retention); presigned URL is a bearer credential.
- Multi-user identity, MFA, document-level authorization, multi-tenant workspaces and per-user audit logs.
- Legal chain-of-title: agreements, assignments, and attested rights management documents.
- Malware scanning, robust media probing/transcoding, legal/copyright takedown review and retention policies.
- Evidence PDF+ZIP export, timestamps, and optional S3 Object Lock-equivalent retention controls where supported.
- App build, lint, typecheck and integration tests with real Neon/R2 credentials in a private staging environment.

## Status check

Current source has syntactic TypeScript transpilation and local no-dependency tests passing. Full `npm install` and `next build` could not be run locally because registry.npmjs.org resolution failed (EAI_AGAIN). CI workflow checks source once dependencies are installed in GitHub Actions.
