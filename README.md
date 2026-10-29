# ToolNet Copyright

**Ownership provenance · Private originals · Public registry · Infringement case tracking**

A Next.js 16 / TypeScript application for managing original photos and videos, self-declared rights ownership and technical evidence. Built for Vercel with **Neon PostgreSQL** and a **private Cloudflare R2 bucket**.

> **Legal limitation:** Publishing a work or storing SHA-256 does not independently certify copyright ownership. Timestamps in this release are server/database timestamps, not accredited RFC 3161 timestamps. For disputes retain originals, project files, contracts and independently verifiable timestamps.

## Features

- Responsive Vietnamese public website, searchable-by-link registry and separate admin workspace.
- Admin login with scrypt password hash, signed HTTP-only session cookie, origin checks and database-backed login attempt limits.
- Browser → R2 upload via short-lived presigned PUT URL; uploads never pass through the Vercel request body.
- Streaming SHA-256 verification against the staged source and copied private vault object; only verified works with a separate public preview can be published.
- Image preview conversion to EXIF-stripped WEBP (up to 25 MB preview inputs); public video playback of a separate uploaded preview via a short-lived signed GET URL after explicit publication; the original vault object remains private.
- Append-only evidence events with Postgres triggers and a per-asset hash chain; private JSON evidence export.
- Infringement cases and original/public work pages.
- TypeScript, Zod validation, Next.js route handlers and CI checks.

## Architecture

```text
Browser  ──→ Vercel / Next.js App Router ───→ Neon Postgres
       │            │                          ├─ assets
       │            │                          ├─ evidence_events
       │            │                          ├─ infringement_cases
       │            │                          └─ admin_login_attempts
       │            └── signed R2 operations
       └── direct PUT ──→ Cloudflare R2 private bucket
                             ├─ staging/ (temporary)
                             ├─ vault/   (verified originals)
                             └─ previews/ (sanitized previews)
```

## 1. Neon PostgreSQL

1. Create a Neon project and database. Choose a region close to your Vercel functions for faster connections.
2. In the Neon SQL Editor, execute **`db/schema.sql`** once. It uses `CREATE TABLE IF NOT EXISTS` and `CREATE EXTENSION IF NOT EXISTS pgcrypto`.
3. Copy the pooled `DATABASE_URL` into Vercel Environment Variables; never commit it or post it publicly.
4. For production, restrict the application database role and manage future changes using versioned migrations.

## 2. Cloudflare R2

1. Create a **private** bucket called `toolnet-copyright-private` (or another name matching `R2_BUCKET`). Do not enable public `r2.dev` access.
2. Create an R2 S3 API credential limited to the selected bucket with the read/write operations the service needs.
3. Set R2 environment variables described in `.env.example`.
4. In bucket Settings → CORS, configure `r2-cors.json`; replace `YOUR-DOMAIN` with the actual Vercel domain. Include any custom domain or local origin you use. This is required for uploads from the browser.
5. Consider R2 lifecycle cleanup for abandoned `staging/` objects and separate independent backups / retention policies for `vault/`.

The S3 endpoint is `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`; `region: auto`.

## 3. Admin credentials

Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET` (32+ random characters). Generate a secure random secret with:

```bash
openssl rand -base64 48
```

Create a password hash locally:

```bash
npm run admin:hash
```

Use a unique, strong password (12+ characters). The hash output begins with `scrypt:`. Avoid storing any password plaintext in the repository, terminal history, or screenshots.

## 4. Install / run locally

Requires Node.js 22+ and npm. Copy `.env.example` to `.env.local`, set real values and initialize Neon schema.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`; visit `/login` to enter the admin area.

### Quality

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 5. GitHub → Vercel

Create a new **private** GitHub repository `LBT-AI/toolnet-copyright` (or any preferred owner) and push the checked source:

```bash
git init
 git add .
 git commit -m "feat: bootstrap ToolNet Copyright"
 git branch -M main
 git remote add origin git@github.com:LBT-AI/toolnet-copyright.git
 git push -u origin main
```

On Vercel, connect that repository to the `toolnet-copyright` project. Set Framework Preset to Next.js, Node.js 22.x, and configure all server-only environment variables. Deploy production from `main`. Set `NEXT_PUBLIC_SITE_URL` to your real production origin and update R2 CORS accordingly.

### Required environment variables

| Key | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres pooled connection URL |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_BUCKET` | Private bucket name |
| `R2_ACCESS_KEY_ID` | R2 key ID (server only) |
| `R2_SECRET_ACCESS_KEY` | R2 secret key (server only) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD_HASH` | scrypt hash (not plaintext) |
| `AUTH_SECRET` | JWT signing secret |
| `NEXT_PUBLIC_SITE_URL` | Public canonical site URL |

All secrets must remain server-only. Only `NEXT_PUBLIC_SITE_URL` has the `NEXT_PUBLIC_` prefix.

## Workflow

1. Log in to `/dashboard`.
2. Register a work on `/dashboard/new`. Choose rights basis accurately and upload an original file.
3. Return to the dashboard. Click **Kiểm tra SHA-256** to move the file into the private vault after double-hash verification.
4. For videos, upload a separate 50 MB or smaller MP4/WEBM preview (do not reuse your source original). Then click **Công bố** to create a public evidence page at `/works/<uuid>`.
5. Use `/dashboard/cases` to record suspected infringements, links and notes.
6. Download the **Chứng cứ JSON** manifest and private verified original from the dashboard.

## Operational considerations and current limits

- Upload maximum **250 MiB per work** via single-part signed PUT. Image preview generation is currently limited to 25 MiB source images; larger image works can be verified but cannot be published until a thumbnail pipeline is implemented. Large videos should use multipart upload and background verification in the next phase; Vercel function timeout and R2 throughput affect large-file verification.
- `maxDuration=300` for verification requests requires a hosting plan/runtime that supports this duration.
- Original source files are copied to a vault key that contains the verified SHA-256. R2 credentials with write access can still alter objects. Use retention/independent backups and external timestamping before making strong non-tampering claims.
- Original source metadata/content that may contain private information should only be downloaded by administrators. Public image previews strip metadata. Public video pages only serve a separately uploaded preview, not the vault original.
- R2 presigned PUT links are bearer credentials valid for 5 minutes. Browser CORS is an origin control, not a substitute for authorization. No secrets are exposed to the browser.
- The app uses a single administrative account to bootstrap. Add role-based access, multi-tenant workspaces, stronger fraud controls, versioned migrations, external timestamps, PDF/ZIP evidence bundles, source-file provenance and takedown platform integrations before using it as a commercial copyright certification service.
- Published works are not certified by ToolNet Copyright; ownership is **self-declared** and the integrity check demonstrates only file content at the time of verification.
- `npm install` generates `package-lock.json`; **commit the lockfile** and switch CI from `npm install` to `npm ci` for fully reproducible installs. Run the full CI workflow before enabling automatic production deploys.

## API inventory

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/health` | Public |
| POST | `/api/auth/login` | Public with rate limit |
| POST | `/api/auth/logout` | Admin |
| POST | `/api/assets/initiate` | Admin |
| POST | `/api/assets/complete` | Admin |
| POST | `/api/assets/:id/verify` | Admin |
| POST | `/api/assets/:id/publish` | Admin |
| GET | `/api/assets/:id/download` | Admin |
| GET | `/api/assets/:id/evidence` | Admin |
| POST + PUT | `/api/assets/:id/preview` | Admin; video preview upload |
| GET | `/api/media/:id` | Only verified and publicly published works |
| POST | `/api/cases` | Admin |

## License

Private source project. No open-source license is granted until the owner chooses one.

## v0.2 — Owner-declared timeline and revisions (2026-10-29)

This release keeps original file hashes, R2 keys, upload timestamps, SHA-256 verification timestamps and ToolNet publication timestamps unchanged. It adds **owner-declared** dates with revision history; it does not backdate technical evidence or provide legal certification.

### Upgrade the existing Neon database first

This is an **additive, idempotent migration**; it does not replace `db/schema.sql` or delete rows. Back up before applying in production.

```bash
cd /root/toolnet-copyright
# DATABASE_URL is from your existing private VPS .env or .env.local (never output it).
# Use a protected shell process with DATABASE_URL exported for this command.
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -1 \
  -f db/migrations/20261029_asset_time_claims.sql
```

**Important:** Run the database migration **before** deploying code v0.2. Previous code continues operating with the new columns. To undo the application rollout, redeploy the previous commit; keep the new DB columns and evidence history intact.

### How to use

1. Admin Dashboard → select **Ngày gốc** for an existing asset.
2. Enter one or more owner-declared dates, in Vietnam time (UTC+07:00): original creation, capture, earliest publication, or rights-effective date.
3. Choose a truthful claimed evidence source, optionally provide a document identifier or URL, and explain the amendment (10+ characters).
4. Confirm the declaration and save. The server creates a new revision, SHA-256 hash of the claimed snapshot, and append-only audit event together in a Neon transaction.
5. Admin can view the full revision history and export it in private **Chứng cứ JSON** format v2. Public work pages label original dates as **owner-declared** and retain separately labeled server upload, verification and platform-publication dates.

The claim snapshot SHA-256 is separate from the immutable original file SHA-256. Neither proves independently when the work was actually created. The system database timestamps are **not** RFC 3161 independent timestamps. Database administrators can still change underlying records with elevated privileges; use independent retention, backups and externally trusted timestamps for stronger evidentiary guarantees.

### API

- `GET /api/assets/:id/time-claims`: administrator only; returns asset + most recent 100 claim revisions.
- `POST /api/assets/:id/time-claims`: administrator only + same-origin check, strictly validated dates and optimistic concurrency. Requires `expectedVersion`, four nullable ISO datetimes with offsets, `timeClaimSource`, `timeClaimReference`, `correctionReason`, `acknowledged: true`.
- `GET /api/assets/:id/evidence`: administrator only; exports all revisions and timeline events.

No new NPM packages or Vercel environment variables are required by v0.2.


### Đăng ký tác phẩm với ngày sáng tạo gốc

Từ v0.2.2, `/dashboard/new` cho nhập ngày sáng tạo gốc và các mốc thời gian tùy chọn ngay khi đăng ký. Hệ thống trước tiên tạo hồ sơ/upload ảnh vào R2, sau đó gọi API time claims v0.2 để ghi nhận phiên bản đầu tiên **trước khi** người quản trị thực hiện `Kiểm tra SHA-256` trên Dashboard. Không cần migration mới nếu đã chạy `db/migrations/20261029_asset_time_claims.sql`. Ngày gốc là thông tin khai báo, không thay thế thời gian máy chủ, không thể dùng để lùi dấu thời gian SHA hoặc thời điểm đăng thực tế. Nếu API ghi ngày thất bại, form cho phép thử lại mà không upload trùng.

**Tumblr:** Có thể tích hợp Tumblr API qua OAuth dưới dạng kênh xuất bản **tùy chọn sau xác minh/công bố**, lưu post ID / permalink / thời gian đăng thực tế. Không coi ngày `date` backdate trên Tumblr là bằng chứng đăng từ quá khứ; không tự động backdate. Việc kết nối cần thông tin ứng dụng Tumblr và cấp quyền tài khoản qua OAuth riêng.


## Tumblr publishing (optional)

On the single ToolNet Copyright project, add the following **server-only** environment variables to the VPS `.env` and **Vercel Production** (do not commit their values):

```text
TUMBLR_OAUTH_CONSUMER_KEY=
TUMBLR_SECRET_KEY=
TUMBLR_TOKEN=
TUMBLR_TOKEN_SECRET=
TUMBLR_BLOG=copyright-toolnet.tumblr.com
```

Apply `db/migrations/20261029_tumblr_publications.sql` in Neon. Open `/dashboard` and select **Kiểm tra kết nối Tumblr**; the server calls the authenticated `/v2/user/info` endpoint without returning secrets. Only an Admin can publish to Tumblr. In v0.4, photos are posted after upload and saving the claimed date, before user-triggered SHA-256 verification. Images: upload a reduced JPEG preview through the Legacy Photo API (`POST /v2/blog/{blog}/post`), with multipart `type=photo`, `data`, the complete declaration in `caption`, and the selected date converted to GMT in `date`. Videos retain NPF link publishing after verification and publication on ToolNet (native video export is intentionally not implemented). Origin dates are owner-declared; actual API submission times remain separate and visible in evidence records.

One `tumblr_publications` row per asset prevents accidental double-publishing. If Tumblr times out or returns an ambiguous server error, the row is marked `uncertain`; check the Tumblr blog and manually reconcile before trying again. No original R2 vault objects are exposed.

Tumblr API failures include the HTTP status, differing `meta.status`, and available `errors`/`meta.msg` details; credentials are redacted. Existing Post IDs prevent redispatch even if a row has a failed status. A failure to read the display date after creation preserves the Post ID and URL and never triggers another post.


### Owner-declared date → Tumblr → SHA-256 (v0.4)
For photo uploads, the admin selects an original creation date when registering. ToolNet uploads to private staging R2, saves the claimed date to immutable claim history, prepares a separate preview, posts it to Tumblr with an optional display `date`, stores the returned post ID/URL and any read-back date, then permits user-triggered SHA-256 verification. A Tumblr backdated **display** date is not an independent publication timestamp. The actual API attempt and completion time remain system-generated and are exported with the evidence manifest. Use `db/migrations/20261029_tumblr_display_dates.sql` once before deploying this code. Existing verified assets and video workflows remain supported. Tumblr can reject very early dates; do not claim success without API confirmation.

### Tumblr copyright declaration template
For photographs the posted text uses the user-supplied declaration beginning `DECLARATION OF COPYRIGHT OWNERSHIP`, with the exact brand `copyright-toolnet`, place `Japan` and email `toolnet.official@gmail.com`. The **DATE OF CREATION / PRODUCTION** comes from the owner's selected creation date (`DD/MM/YYYY`). The **DATE OF DECLARATION** uses the actual calendar date when the declaration is sent, because posting today cannot constitute a sworn statement made years earlier. The form requires a separate affirmative checkbox confirming the sole-author, exclusive-ownership, authority-to-sign and Japan assertions. Tumblr publishing API rejects requests without explicit confirmation. A date backdated for Tumblr display is not verified history.

### Public work certificate

`/works/{asset UUID}` displays a responsive ToolNet Copyright record with owner-declared creation dates, a permanent URL, an internally generated QR code (`qrcode`), a declaration summary, Tumblr link and sharing controls. A successful Tumblr photo publication can expose this record while SHA-256 verification is pending; other private records remain unavailable. The verification badge and file hash require verified status, a valid SHA-256 and a recorded verification timestamp. Only verified, publicly published records are indexable.

`/api/works/{asset UUID}/preview` applies the same visibility policy and streams only an allowlisted derived preview from private R2, including video byte ranges. It never redirects to or serves original/staging keys. The multicolour microtext strip encodes the permanent URL as Base64 for display; it is neither a digital signature nor independent authentication evidence. This presentation does not change Tumblr captions, posting dates, the publication pipeline, stored timestamps or the database schema.

The public record follows the owner-supplied HTML documented in `DESIGN.md`: a centered 820px document, thin white header, one pale-green status banner, label/value tables, a real preview and a lower QR/permanent-link block. Tables stack at 600px for mobile. Missing license terms and unsupported cryptographic proof methods produce no placeholder sections or claims. Page styles live in `src/app/works/[id]/certificate.css` and do not change other pages' site chrome.
