# SEO Phase 2 — pending changes for production

Phase 2 (see `src/lib/i18n.ts`, `src/views/*.astro`, `src/pages/es/`,
`astro.config.mjs`, `nginx.conf`) gives each language its own URL: English
unprefixed, Spanish under `/es`. Every page is pre-rendered in exactly one
language, with reciprocal `hreflang` alternates and an i18n-aware sitemap.
This file is the checklist for go-live — work through it alongside
`Docs/SEO_phase1_prod_changes_pending.md` (not yet fully closed out) before
the site actually launches. Later phases get their own
`Docs/SEO_phaseN_prod_changes_pending.md` file; don't merge them into this one.

- [ ] **Backend: unify the `?locale=` param everywhere.**
  What: every endpoint should accept `?locale=en|es` as the primary param;
  `?lang=` is documented as a temporary alias. The frontend already sends
  both on every request (`withLocaleParam` in `src/lib/i18n.ts`), so nothing
  breaks if this lands late — but until it does, a handful of endpoints that
  only read `lang` today keep working only because of that alias.
  Where: the CMS repo (`policrafters-cms`), per `Docs/API_CONTRACT.md`
  "Convenciones generales".
  Why: today some endpoints read `lang`, some read `locale`, inconsistently —
  this was already true before Phase 2, and is now written down as the
  target to converge on.
  How to verify: `curl` a couple of endpoints with only `?locale=es` (no
  `lang`) and confirm a Spanish response.

- [ ] **Backend: list only the products/pages published in each language.**
  What: a listing endpoint queried with `?locale=es` (e.g.
  `GET /api/products?locale=es`) must return only the records actually
  published in Spanish, each with its `slug`.
  Where: the CMS repo. The frontend side is already built on this contract —
  `src/pages/collections/[...slug].astro` and
  `src/pages/es/collections/[...slug].astro` each call `getStaticPaths`
  against their own language's listing.
  Why: until the backend filters by language, both language's
  `getStaticPaths` fall back to generating paths from BOTH language's
  mock slugs unioned, which means a product that doesn't really exist in
  Spanish yet would still get an `/es/collections/...` page.
  How to verify: with `PUBLIC_USE_API=true`, confirm `/es/collections/<slug>`
  404s for a product that Wagtail hasn't published in Spanish, and that it
  isn't in the Spanish sitemap entries.

- [ ] **Backend: add `meta.translations`.**
  What: an optional `{ "en": "<slug>", "es": "<slug>" }` object in every
  page-type response, built from Wagtail's `translation_key`. See
  `Docs/API_CONTRACT.md` "Convenciones generales" and the `ModelPage`
  section for the full shape and example.
  Where: the CMS repo.
  Why: without it, every view assumes both languages exist for a page
  (`SeoHead.astro`'s default `availableLangs = LANGS`), so a page missing in
  one language still gets an `hreflang` alternate and a switcher link
  pointing at a 404 instead of falling back to that language's home.
  How to verify: once sent, pass it through to each view's `availableLangs`
  prop (not yet wired up — the frontend currently always assumes both
  languages exist) and confirm the switcher/hreflang fall back correctly for
  a page that's English-only.

- [ ] **Backend: update Wagtail preview and "view live" URLs.**
  What: the preview/live-view links Wagtail generates should point at
  `https://policrafters.com/<path>` for English and
  `https://policrafters.com/es/<path>` for Spanish, both with no trailing
  slash.
  Where: the CMS repo.
  Why: today's preview is a `postMessage` from an iframe (see
  `src/pages/preview.astro` and the `window.addEventListener('message', ...)`
  listener in each view), so this doesn't block preview from working at
  all — but an editor's "view live" button for a Spanish page still needs to
  land on the `/es/...` URL, not the English one.
  How to verify: from Wagtail's admin, open "view live" on a Spanish page and
  confirm it opens `/es/...`.

- [ ] **Sync `Docs/API_CONTRACT.md` to the CMS repo.**
  What: this phase edited the frontend's copy of the contract (unified
  `locale` param, `meta.translations`, per-language listings, preview/live
  URLs). Copy those changes into the same file in `policrafters-cms`.
  Where: both repos — `Docs/API_CONTRACT.md` is meant to be identical in each.
  Why: the two copies will otherwise drift, and the backend items above have
  no written spec on the CMS side until this happens.
  How to verify: diff the two files; they should match.

- [ ] **Verify the nginx config in a real container.**
  What: `curl -I` each of the following against a container built from this
  repo's `Dockerfile`/`nginx.conf`, and confirm the status/redirect shown:
  | Request | Expected |
  |---|---|
  | `/services?lang=es` | 301 → `/es/services` |
  | `/?lang=es` | 301 → `/es` |
  | `/collections?category=pivot&lang=es` | 301 → `/es/collections?category=pivot` |
  | `/services?lang=en` | 301 → `/services` |
  | `/es/services?lang=es` | 301 → `/es/services` |
  | `/es/services?lang=en` | 301 → `/services` |
  | `/es/` | 301 → `/es` |
  | `/es` and `/es/services` | 200 |
  | `/es/does-not-exist` | 404, Spanish 404 body (`src/pages/es/404.astro`) |
  | `/does-not-exist` | 404, English 404 body (`src/pages/404.astro`) |
  Where: `nginx.conf` (the `map`s above `server {}`, the two `if ($arg_lang = ...)`
  blocks, and the `@error404` named location).
  Why: this was written and reasoned through carefully, but **not** verified
  against a running nginx — neither Docker nor a local nginx binary was
  available in the environment this was built in. Treat it as unverified
  until this checklist passes, the same way Phase 1's nginx config was.
  How to verify: the ten `curl -I` checks above, each matching its expected
  status/redirect target.

- [ ] **Add the Spanish URLs to Google Search Console and Bing Webmaster Tools.**
  What: once indexing is turned on (see Phase 1's "Turn indexing on"), verify
  the sitemap now lists 48 URLs (24 English + 24 Spanish — see
  `dist/sitemap-0.xml`) and check Search Console's "International targeting" /
  hreflang report for errors.
  Where: external (Search Console / Webmaster Tools), not the repo.
  Why: hreflang mistakes (e.g. a missing reciprocal tag) are typically only
  caught by Search Console's own report, not by anything buildable locally.
  How to verify: the report shows no hreflang errors, and both language
  counts in the sitemap match what Search Console indexes over the following
  weeks.

- [ ] **Re-run the Phase 1 placeholder-link audit for the new `/es/` pages.**
  What: Phase 1's "Resolve every remaining `href=\"#\"` placeholder" item
  (same file) was written before `/es/` existed. Re-check it covers the
  Spanish route tree too (the component-level ones — `Header.astro`,
  `CatalogsCarousel.astro`, `DirectContact.astro` — already do, since
  they're shared by both languages; the per-page ones in `src/views/*.astro`
  do too, for the same reason).
  Where: same files as Phase 1's checklist.
  Why: a crawled `href="#"` is a dead link to search engines, same reasoning
  as Phase 1, now doubled across two languages.
  How to verify: crawl both `/en` and `/es` with Screaming Frog or
  `linkinator` and confirm zero `#`-only anchors remain outside the
  deliberately-placeholder ones already tracked in Phase 1's checklist.
