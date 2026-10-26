# SEO Phase 1 — pending changes for production

Phase 1 (see `src/components/SeoHead.astro`, `src/lib/seo.ts`, `src/pages/robots.txt.ts`,
`nginx.conf`) deliberately left the site in "development mode": noindex by default,
pointed at the production domain but not yet serving from it, and several
placeholder links left untouched. This file is the checklist for go-live —
work through it when the site is actually ready to launch on
`https://policrafters.com`. Later phases get their own
`Docs/SEO_phaseN_prod_changes_pending.md` file; don't merge them into this one.

- [ ] **Turn indexing on.**
  What: set `PUBLIC_ALLOW_INDEXING=true` in the production build environment.
  Where: production `.env` / CI build variables (see `.env.example`).
  Why: it defaults to unset (noindex) everywhere else — `src/lib/seo.ts`'s
  `isIndexingAllowed()`, `src/pages/robots.txt.ts`, every page's robots meta tag.
  How to verify: build with it set, confirm `dist/robots.txt` says `Allow: /`
  and no page (except `404`, `preview`, `projects`) has a `noindex` meta tag.

- [ ] **Point `SITE_URL` at production (and staging at itself).**
  What: set `SITE_URL=https://policrafters.com` for the production build.
  Where: production build env (`astro.config.mjs` reads it via `loadEnv`).
  Why: canonical, Open Graph and sitemap URLs are all built from this. It
  currently defaults to `https://policrafters.com` even for the staging
  build at `astro.novatierra.cloud`, which is harmless only because staging
  is also noindexed at three other layers (robots meta, robots.txt, the
  Traefik `X-Robots-Tag` header below) — it should still be set explicitly
  for staging (e.g. `SITE_URL=https://astro.novatierra.cloud`) so its own
  canonical/OG tags are self-consistent if anyone inspects them directly.
  How to verify: `grep -o 'canonical" href="[^"]*"' dist/*.html` and
  `cat dist/sitemap-0.xml` — the origin should match the environment that
  built them.

- [ ] **Remove the staging noindex middleware; point the router at the real domain.**
  What: delete the `traefik.http.middlewares.policrafters-noindex...` and
  `traefik.http.routers.policrafters.middlewares=policrafters-noindex` labels;
  change `traefik.http.routers.policrafters.rule=Host(...)` to
  `policrafters.com`. Decide on `www.policrafters.com` (redirect it to the
  apex, or vice versa) and add that routing/redirect.
  Where: `docker-compose.yml`.
  Why: that middleware sends `X-Robots-Tag: noindex, nofollow` on every
  response — correct for staging, would block indexing in production if left on.
  How to verify: `curl -I https://policrafters.com/` shows no `X-Robots-Tag`
  header; `curl -I https://www.policrafters.com/` behaves as decided.

- [ ] **Submit the sitemap to search engines.**
  What: verify domain ownership and submit
  `https://policrafters.com/sitemap-index.xml` in Google Search Console and
  Bing Webmaster Tools.
  Where: external (Search Console / Webmaster Tools), not the repo.
  Why: nothing gets crawled faster just because robots.txt allows it —
  submitting the sitemap is what gets it discovered promptly.
  How to verify: both consoles show the sitemap as "Success" with the
  expected URL count (48 pages as of Phase 2 — 24 English + 24 Spanish,
  the legacy `/collections/product` redirect stub excluded in both languages).

- [ ] **Replace the default Open Graph image.** *(Placeholder generated in Phase 3:
  `public/images/og/policrafters-og.jpg`, a 1200×630 crop of the hero poster built
  by `scripts/optimize-media.mjs` — final design asset still pending; see
  `Docs/SEO_phase3_prod_changes_pending.md`.)*
  What: commission/crop a dedicated 1200×630 share image (under ~300 KB) and
  wire it in as the fallback in `SeoHead.astro`.
  Where: `src/components/SeoHead.astro` (`DEFAULT_OG_IMAGE`), new file under
  `public/images/`.
  Why: the current fallback (`/images/pages/horizontal_video_static_image.png`)
  is a 4.3 MB homepage hero poster, not sized for OG (1200×630) or optimized
  for a link preview's load time.
  How to verify: test a URL with no CMS `og_image` in Facebook's Sharing
  Debugger / opengraph.xyz; confirm fast load and no cropping artifacts.

- [x] **Add an apple-touch-icon.**
  Done: `public/apple-touch-icon.png` (180×180) plus the full favicon set
  (`favicon-16/32/48/192/512.png`), a `site.webmanifest`, and their
  `<link>`/`<meta name="theme-color">` tags all live in `SeoHead.astro` now.
  How to verify: "Add to Home Screen" on iOS Safari shows the icon, not a
  page screenshot.

- [x] **Replace `public/favicon.svg` with the real Policrafters mark.**
  Done: it now holds the Policrafters "P"-in-circle mark (matching
  `public/favicon-512.png`) instead of the Astro starter logo; its `<link>`
  tag in `SeoHead.astro` needed no change.

- [ ] **Resolve every remaining `href="#"` placeholder.**
  What: point each of these at a real URL once the destination page/section exists.
  Where (as of this phase):
  - `src/components/Footer.astro:152` — residential project links (per-item, `data-footer-key="residential-link-*"`)
  - `src/components/Footer.astro:168` — commercial project links (`commercial-link-*`)
  - `src/components/Footer.astro:190` — each social media icon in `socialLinks` (Instagram/Facebook/etc.)
  - `src/components/Footer.astro:136` — falls back to `#` when `linkHrefs[index]` is unset; most footer column links are still unset
  - `src/components/Header.astro:73` — brand mega-menu items (`url: '#'`; the component already has a `TODO: replace the '#' placeholders with each brand's real external URL`). One spot now, not two — Phase 2 removed `Header.astro`'s separate client-side nav table, which used to carry a second copy of this.
  - `src/views/HomePage.astro:192` — a link in the "about" section
  - `src/views/HomePage.astro:210` — each home "featured projects" card (`.projects-card`)
  - `src/views/HomePage.astro:241` — the projects section CTA button
  - `src/views/HomePage.astro:264` — the "about" section CTA button
  - `src/views/ProductPage.astro:168` — each "related model" card (`.related-card`)
  - `src/components/CatalogsCarousel.astro` — falls back to `#` when a catalog item has no `file_url` (download PDF missing)
  - `src/components/DirectContact.astro` — falls back to `#` when a direct-contact item has no `url`
  - `src/views/CollectionsPage.astro` (`productHref`) and `src/views/ProductPage.astro` (`backToMenuHref`/related models) fall back to `#` too, but only when the underlying `product.slug` / `link.url` is genuinely missing from the data — not placeholders by design, just missing-data guards. Worth a final data audit before launch, but no code change expected.
  Why: a crawled `href="#"` is a dead link to search engines; several of
  these are also intended to be real internal/external destinations that
  readers will click.
  How to verify: crawl the production build with a tool like Screaming Frog
  or `linkinator` and confirm zero `#`-only anchors remain (outside ones
  that are deliberately JS-driven toggles, if any stay that way).

- [ ] **Renovations product links have no real destination.**
  What: every `product.slug` in `src/mocks/renovations-page.en.json` /
  `.es.json` is the literal string `"#"` — there's no renovation detail
  page/route defined anywhere, including in `Docs/API_CONTRACT.md`. Decide
  with the backend whether renovation products get their own detail page
  (and route/contract) or link elsewhere (e.g. into `/collections/<slug>`
  where the same product exists), then update `src/views/RenovationsPage.astro:41`
  and the mocks/contract together.
  Where: `src/views/RenovationsPage.astro`, `src/mocks/renovations-page.*.json`,
  `Docs/API_CONTRACT.md`.
  Why: same as above — currently a guaranteed dead link on every renovation
  product card.
  How to verify: after the decision, confirm the generated hrefs resolve
  to real, 200-status pages.

- [ ] **Decide the fate of `/projects` and `/es/projects`.**
  What: either give `src/views/ProjectsPage.astro` real content (projects,
  photos, copy) and remove its `noindex` + the sitemap `filter` exclusion in
  `astro.config.mjs`, or delete the route entirely (both
  `src/pages/projects.astro` and `src/pages/es/projects.astro`).
  Where: `src/views/ProjectsPage.astro`, `src/pages/projects.astro`,
  `src/pages/es/projects.astro`, `astro.config.mjs`.
  Why: it's currently a placeholder stub ("Projects served from Wagtail or
  static content will appear here.") with no links pointing to it anywhere
  in the site (confirmed via a repo-wide search) — it exists but isn't part
  of the actual site structure yet. See also Phase 4's local-SEO section in
  the "Fase 4 - SEO Policrafters.docx" plan, which turns this into a real
  project gallery.
  How to verify: if kept, it has real unique content and is reachable from
  navigation; if removed, `/projects` 404s cleanly and nothing links to it.

- [ ] **Confirm the live nginx behavior on the real domain.**
  What: `curl -I` the production URL for: a clean path (expect 200), the
  same path with a trailing slash (expect 301 to the no-slash form), an
  unknown path (expect 404, serving the custom `404.html` content), and a
  hashed `/_astro/*` asset (expect a long-lived `Cache-Control`).
  Where: production host, using `nginx.conf` / `Dockerfile` as built in this
  phase.
  Why: `nginx.conf` was written and build-tested in this phase, but **not**
  verified against a running container — Docker wasn't available in this
  environment. Treat it as unverified until this check passes.
  How to verify: the four `curl -I` checks above, each matching its expected
  status/header.

- [ ] **Write real `seo_title` / `search_description` for every page in the CMS.**
  What: review and fill in the SEO fields Wagtail exposes per page type.
  Where: Wagtail CMS, all page types listed in `Docs/API_CONTRACT.md`.
  Why: several mock descriptions are currently thin placeholders, e.g.
  contact: "Get in touch with Policrafters"; direct contact: "Direct contact
  options for Policrafters." `buildDescription()` in `src/lib/seo.ts` will
  always produce *something* (falling back to a generic site description),
  but a real, page-specific description converts better in search results.
  How to verify: spot-check a handful of pages' rendered `<meta name="description">`
  against what an editor intended to say.
