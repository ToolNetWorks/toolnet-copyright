# Public work record — document typography

## Reference and direction

The owner-supplied HTML remains the structural reference: a centered 820px record, thin white navigation, label/value tables, actual preview, an ownership statement and a QR/permanent-link block. Following the owner's feedback that Arial and the small uppercase labels looked unprofessional, the type system now follows a restrained document style.

## Typography and layout

- White `#FFFFFF`, ink `#171717`, restrained green `#285C44` and blue links `#245C78`. No cream, gold, decorative seals, government emblems or legal-certification claims.
- Source Serif 4 for the 36px document heading, 22px section headings and 21px work title. Weights 500, natural spacing and optical sizing. The document is titled “Hồ sơ quyền tác giả” with the English subtitle “Copyright Ownership Record”.
- Source Sans 3 at 15px for values and paragraphs, 13px/600 for labels and 12px for secondary text. Labels use natural case rather than small, tracked uppercase text. Body and labels are consistently Vietnamese; hashes, UUIDs and permanent-link technical strings retain monospace.
- Fonts are unmodified WOFF2 subsets (Latin, Latin extended and Vietnamese), self-hosted under `public/fonts/certificate/`. Source URLs and SIL OFL license texts are shipped beside the assets. No runtime Google Fonts requests are required for this page's typography.
- Header/content max-width 820px. Tables retain the 210px desktop label column, thin grey rules and subtle label backgrounds. The large green demo banner becomes one compact, evidence-driven status badge below the record identifiers.
- At 600px and below, table labels/values stack with readable 15px values; the document heading becomes 30px. QR/link content wraps; copy/share buttons form two equal-width, minimum-44px targets below the QR block.
- Preview stays 320px on desktop and fits the content width on mobile. Footer text has readable contrast. Microtext remains deliberately small display data over faint line work, with a thin guilloché bottom edge.
- The page's white header/footer use scoped `:has()` rules; client navigation to other routes restores their existing shared site chrome.

## Evidence and data boundaries

The page continues to use the existing public-work helper and protected public R2 preview route. A verified state/hash requires verified status, a valid SHA-256 and a recorded verification timestamp. Pending records have one pending badge and no verified hash.

`original_created_at` is explicitly owner-declared. Upload, verification and public-release timestamps retain their actual database meanings. Unsupported demonstration DigiCert/RFC3161, Ed25519, C2PA, other hashes, license terms and proof links remain omitted. The title describes a private ToolNet record; the footer distinguishes it from government copyright registration and DMCA certification.

Neon, R2 access rules, Tumblr captions/display dates, upload/verification pipeline and schema are unchanged. No database writes are needed for visual fixtures.

## Verification artifacts

Screenshots, isolated SSR fixtures and browser results are kept under `node_modules/.cache/toolnet-certificate/typography-v5/` (not shipped). Check desktop 1440px and WebKit iPhone 390px; additionally cover 320, 375, 600/601, 768 and 1024px. Verify actual font loading and Vietnamese glyphs, no overflow, one truthful badge, QR/microtext consistency, copy/share/fallback, real preview, private-route 404s and shared-header restoration after navigation. Run lint, typecheck, unit tests, production build and diff checks before release.

## Completed validation

- Visually inspected the final desktop 1440px, WebKit iPhone 390px and pending-state iPhone screenshots. Tables and the 820px shell remain intact, with one verification badge and consistent Vietnamese field labels.
- Browser checks at 320, 375, 390, 600, 601, 768, 1024 and 1440px found no horizontal overflow. Actual R2 preview, QR/microtext, clipboard, native share/manual-copy fallback and private-route 404 checks passed. Site chrome restores after client navigation.
- Chromium's platform-font inspection confirms custom Source Serif 4 glyphs for Vietnamese headings and custom Source Sans 3 glyphs for labels/owner values; these are not fallback Arial/Georgia renders. Browser font-loading checks also passed on WebKit.
- Isolated pending/published/video fixtures passed desktop and iPhone checks without database writes. Pending records contain no verified badge/hash; native video controls remain.
- Lint: zero errors and one pre-existing registry image warning. Typecheck, production build, 43/43 tests and `git diff --check` passed.
