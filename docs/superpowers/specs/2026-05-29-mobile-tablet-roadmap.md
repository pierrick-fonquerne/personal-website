# Mobile and tablet roadmap

**Status:** living document
**Date:** 2026-05-29
**Context:** post PR #24 (P0+P1+P2: nav burger, mobile sidebar, container-page, fluid typo, tap targets, scrollable tables)

## Baseline Lighthouse mobile (production, 2026-05-29)

| Metric | Score | Target |
| --- | --- | --- |
| Performance | 92 / 100 | 95+ |
| Accessibility | 96 / 100 | 100 |
| Best practices | 100 / 100 | 100 |
| SEO | 100 / 100 | 100 |
| LCP | 2.7 s | < 2.5 s |
| FCP | 2.6 s | < 1.8 s |
| CLS | 0 | 0 |
| TBT | 0 ms | < 200 ms |

Accessibility failures flagged:

- `color-contrast`: at least one text/background pair below WCAG AA 4.5:1
- `label-content-name-mismatch`: at least one button or link whose ARIA name does not contain the visible text

## Roadmap

Each PR below is sized and scoped to land independently. Branches follow the project convention: `fix/...`, `feat/...`, `chore/...`, `docs/...`, `test/...`.

### Wave 1: quick wins (~1 h total)

- **PR-A1 `fix(a11y): color contrast and label mismatch`** (30 min)
  Locate failing contrast pairs via axe DevTools, adjust `--color-fg-muted` or specific surfaces, align `aria-label` on icon buttons with their visible text. Target: 100 / 100 accessibility.

- **PR-A2 `feat(layout): iOS safe area insets`** (30 min)
  Apply `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` on the sticky `Nav`, the full-screen `<dialog>` drawer and the `Footer`. Fixes content hidden behind iPhone X+ notch and home indicator.

### Wave 2: performance (~2.5 h)

- **PR-P1 `perf(fonts): preload Geist Variable, optimize font-display`** (1 h)
  Add `<link rel="preload" as="font" crossorigin>` for the most critical Geist Variable weights, switch `font-display` to `swap` or `optional` where appropriate, evaluate subsetting Latin only. Expected: -300 to -500 ms FCP.

- **PR-P2 `perf(images): hero LCP optimization`** (30 min)
  Apply `fetchpriority="high"` and `loading="eager"` on the LCP image (Hero profile), generate AVIF in addition to WebP, preload the chosen variant. Expected: -200 to -400 ms LCP.

- **PR-P3 `perf(hydration): defer non-critical React islands`** (1 h)
  Audit `client:load` islands, downgrade Hero / Footer / non-above-the-fold islands to `client:visible` or `client:idle`. Expected: -100 ms TBT, lower JS execution mobile.

### Wave 3: mobile content (~4 h)

- **PR-C1 `feat(content): code blocks mobile UX`** (2 h)
  Copy button per `<pre>` via Clipboard API, explicit horizontal scroll, responsive line numbers, copy feedback. Critical for the Rust course chapters.

- **PR-C2 `feat(content): KaTeX overflow scroll`** (15 min)
  Add `overflow-x: auto` on `.katex-display`, optional tap-to-zoom modal for very long formulas.

- **PR-C3 `feat(content): touch-friendly Term tooltip`** (2 h)
  Replace the hover-only tooltip in `<Term>` with a `<details>` inline disclosure or a bottom-sheet pattern when `(pointer: coarse)`. Keep hover behaviour on fine pointers.

### Wave 4: course interactivity (~3 h)

- **PR-I1 `feat(audio): Media Session API`** (1 h)
  Bind `navigator.mediaSession` metadata (chapter title, course, artwork) and action handlers (play, pause, previous, next, seekbackward, seekforward) so the audio player exposes native lock-screen controls on iOS and Android.

- **PR-I2 `feat(courses): reading progress and scroll restoration`** (1 to 2 h)
  Sticky progress bar below the nav driven by `scrollY / scrollHeight`, per-chapter scroll position persisted in `localStorage`, restored on revisit.

### Wave 5: durability and polish (~9 to 11 h)

- **PR-D1 `feat(pwa): web manifest and service worker`** (4 to 5 h)
  `manifest.webmanifest` with icons, theme color, `display: standalone`. Workbox-based service worker caching visited chapters and audio MP3 for offline reading. Web Share API and Add to Home Screen support.

- **PR-D2 `feat(search): Pagefind global search`** (4 to 6 h)
  Index the static output at build time, expose a Cmd+K modal on desktop and a dedicated search page on mobile, with result highlighting. Becomes critical past 50 chapters.

- **PR-D3 `feat(interactive): pinch-to-zoom on diagrams`** (2 h per component)
  Integrate a lightweight `svg-pan-zoom` wrapper on `NeuronDiagram`, `LinearSeparabilityViewer`, `HyperplaneGeometry` and similar visual components.

### Wave 6: quality assurance (~4 to 6 h)

- **PR-Q1 `test(visual): Playwright mobile regression suite`** (4 to 6 h setup)
  Visual regression on iPhone SE, iPhone 14, iPad and Pixel 7 viewports through Playwright, asserted on every PR via GitHub Actions.

## Execution order

1. Wave 1 (a11y + safe area): low risk, immediate visible gain, good momentum after PR #24
2. Wave 2 (performance): brings Lighthouse to 95 to 100
3. PR-I1 alone: differentiating UX, low effort, high reward
4. Wave 3 (content): makes courses actually usable on mobile
5. PR-I2 (progress + scroll)
6. PR-D2 (search): big utility gain
7. PR-D1 (PWA): long-term durability
8. PR-Q1 (visual tests): protects everything else
9. PR-D3 (zoom): premium polish

Total estimated effort: 30 to 40 hours across ~12 PRs.

## Notes

- Re-run Lighthouse mobile after each wave to track real impact.
- Every PR should keep `npm run lint`, `npm run build` and prettier green before merge.
- Branches stay short-lived (TBD); merges happen with `--no-ff` after explicit GO.
