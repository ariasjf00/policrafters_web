import termsEnMock from '../mocks/terms-page.en.json';
import termsEsMock from '../mocks/terms-page.es.json';
import { toDevApiUrl } from './dev-proxy';
import { type Lang, withLocaleParam } from './i18n';

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
const apiUrl = toDevApiUrl(import.meta.env.PUBLIC_TERMS_API_URL || import.meta.env.PUBLIC_TERMS_AND_CONDITIONS_API_URL || '', 'server');

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

  // withLocaleParam sets both `locale` (the unified param) and `lang` (the
  // alias the current API still reads) on a single request — see
  // Docs/API_CONTRACT.md "Convenciones generales".
  const requestUrl = withLocaleParam(apiUrl, lang);

  try {
    const unwrapPayload = (payload: any): any => {
      if (!payload || typeof payload !== 'object') return null;
      if (payload.fields) return payload;
      if (Array.isArray(payload.items) && payload.items.length) return payload.items[0];
      if (Array.isArray(payload.results) && payload.results.length) return payload.results[0];
      return payload;
    };

    const response = await fetch(requestUrl);
    if (response.ok) {
      const raw = await response.json();
      const payload = unwrapPayload(raw);
      if (payload && typeof payload === 'object') return toPayload(payload, fallback);
    }
  } catch (error) {
    console.warn(`No se pudo cargar Terms desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, fallback);
};

export const loadTermsPageContent = async (lang: Lang): Promise<TermsPagePayload> => fetchLang(lang);
