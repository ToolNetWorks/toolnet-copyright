# ToolNet public work record

## Reference and capture context

- Reference supplied by the project owner: https://www.dmca.com/Protection/Status.aspx?ID=d460f760-b506-4db9-9c9c-eabfdf3be143
- Captured 2026-10-29 at desktop 1440×1000 and mobile 390×844.
- Inspected with Firecrawl and Chromium. Dismissed the site's status-error modal to inspect the certificate itself; no account action was performed.
- Reference screenshots: `node_modules/.cache/toolnet-certificate/reference-v3/dmca-desktop-1440.png` and `dmca-mobile-390.png`. Certificate close-ups are stored in the same directory. These are review artifacts, excluded from the application.
- At capture time the supplied UUID returned an unavailable protection record. Its image, QR and creator fields were hidden. Its visible fallback layout has a left badge pane and a larger information pane. The owner's explicit three-column requirement determines the ToolNet layout where this fallback reference does not expose those fields.

## Observed reference properties

Measured from the live page, rather than inferred from the previous ToolNet implementation:

- A compact public-record page inside a guilloché perimeter, not a title page or an illustrated certificate.
- At 1440px, the outer certificate is 1400px wide with 20px outside gutters. The visible fallback panes use approximately 30% / 70% flex bases.
- The left pane groups a single badge with short protection metadata. The content pane starts with the work title and then record/link fields. Body content follows within the certificate.
- Google Sans is the observed font; title 24px, field labels 13px and normal paragraphs around 14px. Labels are regular weight. No serif display typography is needed.
- The page uses a green security border with very light line work inside. The unavailable state introduces red status colors and a modal; these belong to DMCA's status and are not ToolNet verification results.
- The reference mobile view places the title before one badge and then link/record content. Its promotional bars and sales sections are unrelated to the requested ToolNet record and are omitted.

## Owner-required adaptations

- White `#FFFFFF` and ink `#171717`; restrained green `#28783F`. No cream, gold, ornamental card stack or AI-generated background.
- Desktop: left protection pane, center work title/owner/real preview, right permanent URL/QR/identity. Declaration and technical evidence below.
- Mobile, explicitly implemented as named grid areas: logo + record ID → work title → one status badge → large preview → owner + declared date → permanent URL + QR → ownership/evidence → actions → URL microtext.
- The mobile source order also follows that reading order. The desktop grid repositions the same elements; there are no duplicate mobile/desktop badges or owner/date blocks.
- Hide absent license terms, logos, signatures and short links instead of rendering empty sections.
- Keep evidence labels distinct from state badges. The exact SHA-256 is shown only when the existing verification helper has confirmed verified status, a valid hash and a recorded verification timestamp.

## Implementation

- `src/app/works/[id]/page.tsx`: replaces the earlier page structure.
- `src/app/works/[id]/certificate.css`: dedicated stylesheet; the earlier certificate section is removed from global CSS rather than overridden with more theme rules.
- `public/certificate-border.svg`: a small mathematical line pattern for the thin guilloché perimeter. It contains no third-party logo or certificate image. Its geometry is sine-curve line work, not a generated bitmap.
- The current project font, DM Sans with Arial fallback, provides the observed simple sans-serif treatment without adding another font dependency.
- Existing public-work authorization, R2 preview proxy, QR library, permanent UUID URL, clipboard/share behavior and reversible Base64 strip are retained.
- Neon, R2, Tumblr captions/dates, upload/verification pipeline and schema are outside this presentation change.

## Acceptance evidence

Before commit/deployment, record desktop 1440px and mobile 390px screenshots and compare the certificate region with the captured reference. Check the requested mobile sequence, exactly one status badge, no empty license/logo sections, no repeated owner/date panels, no horizontal overflow, real preview rendering, correct QR/microtext target and working copy/share controls.

The unavailable reference does not establish the appearance of a populated DMCA preview/QR state. Fidelity claims therefore concern its record hierarchy, badge/information arrangement, perimeter treatment and compact typography, with the supplied ToolNet requirements governing the populated fields.

### Completed review (2026-10-29)

- Captured `toolnet-desktop-1440.png` (Chromium) and `toolnet-mobile-390.png` (WebKit, iPhone 13) beside the reference captures in the review directory above. Visually inspected the rendered pixels, including the pending-state iPhone capture.
- Compared with the reference: retained the badge/information hierarchy, compact sans-serif text and guilloché perimeter; supplied the requested populated center preview and right URL/QR column. The single-column mobile order follows the owner's explicit acceptance sequence.
- The live example's certificate measures about 1055px high at 1440px and 1259px at 390px. It has one badge, one owner/date block and no empty license/logo/signature panels. Its preview is the actual 1000px-wide R2 derivative, not decorative sample artwork added by this redesign.
- Checked 320, 375, 390, 768, 980, 1024 and 1440px: document width equals viewport width. iPhone uses WebKit rather than only Chromium device emulation. Footer remains below all content.
- Pending, published and video presentation variants were rendered from isolated SSR fixtures without database writes. Pending has no verified badge/hash; video retains native playback controls and the protected public preview route. Fixtures are review-only, not application records.
- Clipboard, native share and manual-copy fallback passed on the real page. QR and reversible microtext point at the same permanent UUID URL. The real R2 preview returns image/webp with no redirect; a private record and private media route remain 404.
- `npm run lint` passed with one pre-existing `next/no-img-element` warning on the registry page. Typecheck, production build, 43/43 tests and `git diff --check` passed before release.
