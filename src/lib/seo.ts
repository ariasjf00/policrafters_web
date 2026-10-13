// Shared SEO helpers used by SeoHead.astro and anything that builds page
// metadata (title, description, canonical/OG URLs, robots). Centralizing
// these rules here is what keeps every page's <head> consistent — see
// src/components/SeoHead.astro.

export const SITE_NAME = 'Policrafters';

// Used whenever a page has no CMS/mock search_description. One sentence,
// grounded in the copy already shipped on the home and why-policrafters
// pages (src/mocks/home.en.json, src/mocks/why-policrafters-page.en.json).
export const DEFAULT_DESCRIPTION =
  'Policrafters designs, manufactures and installs custom glass, aluminum and architectural solutions across South Florida.';

const MAX_DESCRIPTION_LENGTH = 160;

/**
 * Builds the <title> text. Mock/CMS `seo_title` values already come as
 * "Page | Policrafters" (see src/mocks/*.json meta.seo_title), so this only
 * appends the suffix when it's missing, and never doubles it.
 */
export function buildTitle(raw?: string | null): string {
  const value = (raw ?? '').trim();
  if (!value) return SITE_NAME;
  if (value.toLowerCase().includes(SITE_NAME.toLowerCase())) return value;
  return `${value} | ${SITE_NAME}`;
}

/**
 * Builds the <meta name="description"> text: strips any HTML, collapses
 * whitespace, falls back to a real default (never the bare site name), and
 * truncates to ~160 chars at a word boundary so search engines don't cut it
 * off mid-word.
 */
export function buildDescription(raw?: string | null, fallback: string = DEFAULT_DESCRIPTION): string {
  const stripped = (raw ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const value = stripped || fallback;

  if (value.length <= MAX_DESCRIPTION_LENGTH) return value;

  const truncated = value.slice(0, MAX_DESCRIPTION_LENGTH);
  const lastSpace = truncated.lastIndexOf(' ');
  const safeCut = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  return `${safeCut}…`;
}

/**
 * Absolute URL for canonical/OG tags: always built from `site` (the
 * Astro.site configured via SITE_URL — see astro.config.mjs), always
 * strips the query string, and never ends in "/" except for the root path.
 *
 * With `build.format: 'file'` (astro.config.mjs), Astro.url.pathname at
 * build time is the literal output filename — "/services.html",
 * "/index.html" — not the clean URL nginx actually serves (nginx.conf's
 * `try_files $uri $uri.html` maps "/services" to that file). So a
 * ".html"/"index.html" suffix here is a build artifact, not part of the
 * real URL, and must be stripped before it reaches canonical/OG tags.
 */
export function absoluteUrl(path: string, site: URL | undefined): string {
  const base = site ?? new URL('https://policrafters.com');
  const withoutQuery = path.split('?')[0].split('#')[0];
  const withoutIndex = withoutQuery.replace(/\/index\.html$/, '/');
  const withoutHtmlExt = withoutIndex.replace(/\.html$/, '');
  const normalizedPath = withoutHtmlExt === '' || withoutHtmlExt === '/' ? '/' : withoutHtmlExt.replace(/\/+$/, '');
  return new URL(normalizedPath, base).toString();
}

/**
 * Whether search engines are allowed to index this build. Defaults to
 * false (noindex) — see PUBLIC_ALLOW_INDEXING in .env.example and
 * Docs/SEO_phase1_prod_changes_pending.md.
 */
export function isIndexingAllowed(): boolean {
  return import.meta.env.PUBLIC_ALLOW_INDEXING === 'true';
}
