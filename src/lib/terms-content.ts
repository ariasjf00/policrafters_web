import termsEnMock from '../mocks/terms-page.en.json';
import termsEsMock from '../mocks/terms-page.es.json';

export interface TermItem {
  key?: string;
  title?: string;
  body?: string;
}

export interface TermsPagePayload {
  type?: string;
  title?: string;
  locale?: 'en' | 'es';
  meta: {
    seo_title?: string;
    search_description?: string;
  };
  fields: {
    intro_heading?: string;
    intro_body?: string;
    terms: TermItem[];
  };
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, TermsPagePayload> = {
  en: termsEnMock as TermsPagePayload,
  es: termsEsMock as TermsPagePayload
};

const hasEnabledFlag = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const useApi = hasEnabledFlag(import.meta.env.PUBLIC_USE_API);
const apiUrl = import.meta.env.PUBLIC_TERMS_API_URL || import.meta.env.PUBLIC_TERMS_AND_CONDITIONS_API_URL || '';

// No image fields on this page, so unlike services-content.ts / brands-content.ts
// there is no normalizeAssetUrl to carry over.
const toPayload = (source: any, fallback: TermsPagePayload): TermsPagePayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback.fields ?? {};

  const termsSource = Array.isArray(fields.terms) && fields.terms.length
    ? fields.terms
    : (fallbackFields.terms ?? []);
  const terms = termsSource.map((term: any) => ({
    key: term?.key ?? '',
    title: term?.title ?? '',
    body: term?.body ?? ''
  }));

  return {
    type: source?.type ?? fallback.type,
    title: source?.title ?? fallback.title,
    locale: source?.locale ?? fallback.locale,
    meta: {
      ...(fallback.meta ?? {}),
      ...(source?.meta ?? {})
    },
    fields: {
      intro_heading: fields.intro_heading ?? fallbackFields.intro_heading ?? '',
      intro_body: fields.intro_body ?? fallbackFields.intro_body ?? '',
      terms
    }
  };
};

const fetchLang = async (lang: Lang): Promise<TermsPagePayload> => {
  const fallback = mocks[lang];
  if (!useApi || !apiUrl) return toPayload(fallback, fallback);

  let requestUrl = apiUrl;
  let legacyLangUrl = apiUrl;
  try {
    const url = new URL(apiUrl);
    url.searchParams.set('locale', lang);
    requestUrl = url.toString();

    const legacyUrl = new URL(apiUrl);
    legacyUrl.searchParams.set('lang', lang);
    legacyLangUrl = legacyUrl.toString();
  } catch {
    // Relative endpoint: send it as configured.
    const separator = apiUrl.includes('?') ? '&' : '?';
    requestUrl = `${apiUrl}${separator}locale=${lang}`;
    legacyLangUrl = `${apiUrl}${separator}lang=${lang}`;
  }

  try {
    const unwrapPayload = (payload: any): any => {
      if (!payload || typeof payload !== 'object') return null;
      if (payload.fields) return payload;
      if (Array.isArray(payload.items) && payload.items.length) return payload.items[0];
      if (Array.isArray(payload.results) && payload.results.length) return payload.results[0];
      return payload;
    };

    const tryParse = async (url: string): Promise<TermsPagePayload | null> => {
      const response = await fetch(url);
      if (!response.ok) return null;
      const raw = await response.json();
      const payload = unwrapPayload(raw);
      return payload && typeof payload === 'object' ? toPayload(payload, fallback) : null;
    };

    const fromLocale = await tryParse(requestUrl);
    if (fromLocale) return fromLocale;

    const fromLang = await tryParse(legacyLangUrl);
    if (fromLang) return fromLang;
  } catch (error) {
    console.warn(`No se pudo cargar Terms desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, fallback);
};

export const loadTermsPageContent = async (): Promise<{ en: TermsPagePayload; es: TermsPagePayload }> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};
