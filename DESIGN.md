# Public work record — supplied HTML reference

## Current reference

The owner supplied a complete HTML artifact after reviewing the earlier DMCA-derived three-column design. This supplied HTML now determines the page layout: an 820px centered document, a thin white navigation bar, one pale-green status banner, compact label/value tables, an ownership statement and a lower QR/permanent-link block. The previous three-column certificate is replaced, not restyled with overrides.

The provided HTML contains static demonstration values and compiled React/runtime scripts. Only its visible presentation is a reference. The application continues to render its own React server page and existing interactive copy/share component; no supplied scripts, tracking hooks, placeholder destinations or embedded React runtime are copied.

## Visual system

- White background, ink `#171717`, Arial/Helvetica, blue links `#0066CC`.
- Header and content max-width 820px, desktop horizontal padding 20px, content top padding 24px.
- Banner background `#E8F5E9`, green `#2E7D32`, border `#A5D6A7`; a muted version for pending verification.
- Section headings 14px uppercase, normal data 13px, label cells 11px uppercase on `#F5F5F5` with a 210px desktop width. Thin grey table borders and alternating value-row backgrounds.
- Preview 320px wide on desktop, actual R2 derivative, responsive width on mobile.
- At 600px and below, table headers/values stack into readable full-width rows. Body data increases to 14px, title to 15px and touch buttons have a 44px minimum height.
- One status banner only. The repeated demo VERIFIED chips are omitted. No empty license/signature/logo sections.
- QR is a real library-generated PNG encoding the full UUID permanent URL. The bottom microtext retains the same URL in reversible Base64 over faint line work and a thin guilloché bottom edge.
- The public work page supplies its own compact white header/footer. Scoped `:has()` rules suppress the shared dark site chrome only while this page is present; other routes retain their existing chrome.

## Data and evidence

- All work values come from the existing public-work helper. The example's malformed UUID, hardcoded 1997 date, sample image and fake QR are not used.
- `original_created_at` remains owner-declared. Upload, verification and public-release timestamps keep their real database meaning.
- A verified badge/hash requires verified status, a valid SHA-256 and a recorded verification timestamp. Pending records show neither a verified badge nor a hash.
- There are no stored/validated SHA3, SHA-512, PDQ, RFC3161, DigiCert, Ed25519 or C2PA results in the current record model. Those demo rows, Valid labels and placeholder proof links are omitted. No licensing terms are invented.
- Public preview permissions, private originals/staging, Neon, R2, Tumblr captions/dates, schema and upload/verification pipeline remain unchanged.

## Review artifacts

Review-only files live in `node_modules/.cache/toolnet-certificate/reference-v4/`, outside the shipped application:

- `reference.html`: static visual excerpt transcribed from the supplied markup, excluding compiled scripts and fake QR; its test claims are retained solely for visual comparison.
- Desktop 1440px and WebKit iPhone 390px screenshots of the reference excerpt and real page, plus isolated pending/published/video fixtures, are captured before release.
- Check document width, stacked table rows, one status banner, real preview, URL/QR/microtext consistency, copy/share and private-route access guards. Run lint, typecheck, tests and production build before committing and deploying.

## Completed validation

- Inspected screenshots of the supplied visual excerpt and real page at 1440px; both use an 820px outer document and 780px content/table area. The green banner, Arial typography, grey label column, row treatment and section hierarchy follow the supplied HTML. The real page omits unsupported demonstration proof rows and duplicate verification badges.
- Captured the final real page at `toolnet-desktop-1440.png` and `toolnet-mobile-390.png` in the review directory; mobile was rendered with WebKit using the iPhone 13 profile. Visually inspected desktop and mobile pixels.
- Checked 320, 375, 390, 600, 601, 768, 1024 and 1440px: no horizontal document overflow; table headers/values stack at the mobile breakpoint. Native image preview decoded from the actual R2 derivative (1000px source width).
- Pending, published and video variants passed isolated SSR/browser checks at desktop and iPhone sizes without database writes. One banner is present; pending has no verified state/hash. Video retains native controls.
- QR/microtext target consistency, copy, native share, manual-copy fallback, public preview streaming and private-route 404 guards passed. Client navigation restores the shared site chrome on the home page.
- Lint: zero errors, one pre-existing registry `next/no-img-element` warning. Typecheck, 43/43 unit tests, production build and `git diff --check` passed before release.
