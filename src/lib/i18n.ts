// Shared language/path helpers for route-based i18n (SEO Phase 2): English
// unprefixed ("/services"), Spanish under "/es" ("/es/services"). This is the
// single source of this logic — every page/component used to carry its own
// copy of getLangFromUrl/appendLang/syncLangInUrl for the old ?lang= query-param
// system; that system is gone, and everything below replaces it.
//
// See CLAUDE.md "Language handling" for the overall model.

export type Lang = 'en' | 'es';

export const LANGS: Lang[] = ['en', 'es'];
export const DEFAULT_LANG: Lang = 'en';

export function otherLang(lang: Lang): Lang {
  return lang === 'es' ? 'en' : 'es';
}

export function ogLocale(lang: Lang): string {
  return lang === 'es' ? 'es_US' : 'en_US';
}

/**
 * Strips the query string, hash, and the build.format:'file' output-filename
 * artifacts ("/index.html", ".html") from a pathname, and drops any trailing
 * slash (except for "/" itself). This is the same normalization absoluteUrl()
 * in seo.ts has always done for canonical/OG URLs; it's extracted here so the
 * lang helpers below can share it.
 */
export function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split('?')[0].split('#')[0];
  const withoutIndex = withoutQuery.replace(/\/index\.html$/, '/');
  const withoutHtmlExt = withoutIndex.replace(/\.html$/, '');
  return withoutHtmlExt === '' || withoutHtmlExt === '/' ? '/' : withoutHtmlExt.replace(/\/+$/, '');
}

/** 'es' if the first path segment is "es", 'en' otherwise. */
export function getLangFromPath(pathname: string): Lang {
  const normalized = normalizePathname(pathname);
  const [firstSegment] = normalized.split('/').filter(Boolean);
  return firstSegment === 'es' ? 'es' : 'en';
}

/** "/es/services" -> "/services", "/es" -> "/". Leaves English paths untouched. */
export function stripLangPrefix(pathname: string): string {
  const normalized = normalizePathname(pathname);
  if (normalized === '/es') return '/';
  if (normalized.startsWith('/es/')) return normalized.slice(3);
  return normalized;
}

// Paths that are never page routes, so localizePath must leave them alone:
// external URLs, fragment/protocol links, and static assets served from public/.
const ASSET_PREFIXES = [
  '/images/',
  '/videos/',
  '/_astro/',
  '/favicon',
  '/apple-touch-icon.png',
  '/site.webmanifest',
  '/logo_'
];

function isInternalPagePath(path: string): boolean {
  if (!path || path === '#' || path.startsWith('#')) return false;
  if (path.startsWith('//')) return false; // protocol-relative external URL
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return false; // has a scheme: http:, mailto:, tel:, ...
  if (!path.startsWith('/')) return false;
  return !ASSET_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Rewrites an internal page path/href to the given language, preserving any
 * query string and hash. Non-page paths (external URLs, "#", "mailto:",
 * "tel:", static assets) are returned unchanged.
 *
 *   localizePath('/services', 'es')     -> '/es/services'
 *   localizePath('/', 'es')              -> '/es'
 *   localizePath('/es/services', 'en')   -> '/services'
 *   localizePath('/collections?category=pivot', 'es') -> '/es/collections?category=pivot'
 */
export function localizePath(path: string, lang: Lang): string {
  if (!isInternalPagePath(path)) return path;

  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;

  const queryIndex = withoutHash.indexOf('?');
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : '';
  const bare = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  const stripped = stripLangPrefix(bare || '/');
  const localizedBare = lang === 'es' ? (stripped === '/' ? '/es' : `/es${stripped}`) : stripped;

  return `${localizedBare}${query}${hash}`;
}

/**
 * Sets both `locale` (the unified param per Docs/API_CONTRACT.md) and `lang`
 * (the alias the current API still reads) on a CMS request URL, for either
 * an absolute URL or a relative one, preserving any params already set
 * (e.g. `slug`).
 */
export function withLocaleParam(url: string, lang: Lang): string {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('locale', lang);
    parsed.searchParams.set('lang', lang);
    return parsed.toString();
  } catch {
    const [base, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    params.set('locale', lang);
    params.set('lang', lang);
    return `${base}?${params.toString()}`;
  }
}
