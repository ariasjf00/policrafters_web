import catalogsEnMock from '../mocks/catalogs.en.json';
import catalogsEsMock from '../mocks/catalogs.es.json';

// Shared loader for the catalogs endpoint, used by index.astro and contact-us.astro.
//
// Unlike the page loaders, this fetches BOTH languages at build time: the carousel
// ships every string in the markup twice (data-copy-es/-en) so Header's toggle can
// switch it without a reload, which means one localized response is not enough.
// Each language falls back to its own mock independently, matching the per-key
// fallback the pages use — a half-available CMS never blanks the section.

export interface CatalogsCopy {
  catalogs_eyebrow?: string;
  catalogs_heading?: string;
  catalogs_prev_aria?: string;
  catalogs_next_aria?: string;
  catalogs_dot_aria?: string;
}

export interface CatalogItem {
  title?: string;
  image?: { url?: string; alt?: string };
  file_url?: string;
}

export interface CatalogsPayload {
  copy: CatalogsCopy;
  items: CatalogItem[];
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, any> = { en: catalogsEnMock, es: catalogsEsMock };

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = import.meta.env.PUBLIC_CATALOGS_API_URL || '';
const apiOrigin = apiUrl && apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';

// CMS image paths come back host-relative and need the API origin prepended;
// identical-looking /images/... paths from public/ must be left alone. Only values
// known to have come from the API reach this.
const normalizeAssetUrl = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && apiOrigin) return `${apiOrigin}${value}`;
  return value;
};

const toPayload = (source: any, isRemote: boolean, fallback: any): CatalogsPayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback?.fields ?? {};
  const items: CatalogItem[] = Array.isArray(fields.catalogs) && fields.catalogs.length
    ? fields.catalogs
    : (fallbackFields.catalogs ?? []);

  return {
    copy: { ...(fallbackFields.copy ?? {}), ...(fields.copy ?? {}) },
    items: items.map((item) => ({
      ...item,
      image: {
        url: isRemote ? normalizeAssetUrl(item.image?.url) : (item.image?.url ?? ''),
        alt: item.image?.alt ?? ''
      }
    }))
  };
};

const fetchLang = async (lang: Lang): Promise<CatalogsPayload> => {
  const fallback = mocks[lang];
  if (!useApi || !apiUrl) return toPayload(fallback, false, fallback);

  let requestUrl = apiUrl;
  try {
    const url = new URL(apiUrl);
    url.searchParams.set('lang', lang);
    requestUrl = url.toString();
  } catch {
    // Relative endpoint: send it as configured.
  }

  try {
    const response = await fetch(requestUrl);
    if (response.ok) {
      const payload = await response.json();
      if (payload && typeof payload === 'object') return toPayload(payload, true, fallback);
    }
  } catch (error) {
    console.warn(`No se pudo cargar los catálogos desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, false, fallback);
};

export const loadCatalogs = async (): Promise<{ en: CatalogsPayload; es: CatalogsPayload }> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};
