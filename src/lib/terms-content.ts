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

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = import.meta.env.PUBLIC_TERMS_API_URL || '';

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
  try {
    const url = new URL(apiUrl);
    url.searchParams.set('locale', lang);
    requestUrl = url.toString();
  } catch {
    // Relative endpoint: send it as configured.
  }

  try {
    const response = await fetch(requestUrl);
    if (response.ok) {
      const payload = await response.json();
      if (payload && typeof payload === 'object') return toPayload(payload, fallback);
    }
  } catch (error) {
    console.warn(`No se pudo cargar Terms desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, fallback);
};

export const loadTermsPageContent = async (): Promise<{ en: TermsPagePayload; es: TermsPagePayload }> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};
