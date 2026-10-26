import siteSettingsEnMock from '../mocks/site-settings.en.json';
import siteSettingsEsMock from '../mocks/site-settings.es.json';
import { toDevApiUrl } from './dev-proxy';
import { type Lang, withLocaleParam } from './i18n';

// Company details (name, phone, address, hours, ...) used for the JSON-LD
// structured data — see src/lib/structured-data.ts and Docs/API_CONTRACT.md
// "SiteSettings". Same loader shape as contact-content.ts: local mock as the
// baseline, CMS fetch at build time, per-key fallback to the mock.

export interface SiteAddress {
  street?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
}

export interface SiteCertification {
  name?: string;
  issuer?: string | null;
  url?: string | null;
}

export interface SiteSettings {
  legal_name?: string;
  phone?: string;
  email?: string | null;
  addresses: SiteAddress[];
  opening_hours: string[];
  area_served: string[];
  license_number?: string;
  certifications: SiteCertification[];
  social_links: string[];
  logo: { url?: string; alt?: string };
}

const mocks: Record<Lang, any> = { en: siteSettingsEnMock, es: siteSettingsEsMock };

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = toDevApiUrl(import.meta.env.PUBLIC_SITE_SETTINGS_API_URL || '', 'server');
const apiOrigin = apiUrl && apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';

const normalizeAssetUrl = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && apiOrigin) return `${apiOrigin}${value}`;
  return value;
};

const pickList = <T>(value: unknown, fallback: unknown): T[] =>
  Array.isArray(value) && value.length ? (value as T[]) : Array.isArray(fallback) ? (fallback as T[]) : [];

const toSettings = (source: any, isRemote: boolean, fallback: any): SiteSettings => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback?.fields ?? {};
  const logoSource = fields.logo ?? fallbackFields.logo;

  return {
    legal_name: fields.legal_name || fallbackFields.legal_name,
    phone: fields.phone || fallbackFields.phone,
    email: fields.email || fallbackFields.email,
    addresses: pickList<SiteAddress>(fields.addresses, fallbackFields.addresses),
    opening_hours: pickList<string>(fields.opening_hours, fallbackFields.opening_hours),
    area_served: pickList<string>(fields.area_served, fallbackFields.area_served),
    license_number: fields.license_number || fallbackFields.license_number,
    certifications: pickList<SiteCertification>(fields.certifications, fallbackFields.certifications),
    social_links: pickList<string>(fields.social_links, fallbackFields.social_links),
    // normalizeAssetUrl only runs on a logo that actually came from the API —
    // the mock's /logo_black.png lives in public/ and must not be prefixed.
    logo: {
      url: isRemote && Boolean(fields.logo) ? normalizeAssetUrl(logoSource?.url) : (logoSource?.url ?? ''),
      alt: logoSource?.alt ?? ''
    }
  };
};

const cache = new Map<Lang, Promise<SiteSettings>>();

const fetchLang = async (lang: Lang): Promise<SiteSettings> => {
  const fallback = mocks[lang];
  if (!useApi || !apiUrl) return toSettings(fallback, false, fallback);

  // withLocaleParam sets both `locale` (the unified param) and `lang` (the
  // alias the current API still reads) — see Docs/API_CONTRACT.md.
  const requestUrl = withLocaleParam(apiUrl, lang);

  try {
    const response = await fetch(requestUrl);
    if (response.ok) {
      const payload = await response.json();
      if (payload && typeof payload === 'object') return toSettings(payload, true, fallback);
    }
  } catch (error) {
    console.warn(`No se pudo cargar SiteSettings desde ${requestUrl}. Usando mock local.`, error);
  }

  return toSettings(fallback, false, fallback);
};

// Memoized per language: SeoHead.astro and several views all need this on
// every page, and the build would otherwise refetch it ~50 times.
export const loadSiteSettings = (lang: Lang): Promise<SiteSettings> => {
  let pending = cache.get(lang);
  if (!pending) {
    pending = fetchLang(lang);
    cache.set(lang, pending);
  }
  return pending;
};
