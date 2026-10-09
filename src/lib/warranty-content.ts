import warrantyEnMock from '../mocks/warranty-page.en.json';
import warrantyEsMock from '../mocks/warranty-page.es.json';

export interface WarrantyItem {
  label?: string;
  text?: string;
}

export interface WarrantySection {
  key?: string;
  title?: string;
  column?: 'left' | 'right';
  intro?: string;
  items: WarrantyItem[];
}

export interface WarrantyPagePayload {
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
    sections: WarrantySection[];
  };
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, WarrantyPagePayload> = {
  en: warrantyEnMock as WarrantyPagePayload,
  es: warrantyEsMock as WarrantyPagePayload
};

const hasEnabledFlag = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const useApi = hasEnabledFlag(import.meta.env.PUBLIC_USE_API);
const apiUrl = import.meta.env.PUBLIC_WARRANTY_API_URL || '';

// `column` only ever comes from the EN payload (see toPayload below) and is
// language-independent, so it's normalized once here rather than per-locale.
const normalizeColumn = (value: unknown): 'left' | 'right' | undefined => {
  return value === 'left' || value === 'right' ? value : undefined;
};

// No image fields on this page, so unlike services-content.ts / brands-content.ts
// there is no normalizeAssetUrl to carry over.
const toPayload = (source: any, fallback: WarrantyPagePayload): WarrantyPagePayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback.fields ?? {};

  const sectionsSource = Array.isArray(fields.sections) && fields.sections.length
    ? fields.sections
    : (fallbackFields.sections ?? []);
  const sections: WarrantySection[] = sectionsSource.map((section: any) => ({
    key: section?.key ?? '',
    title: section?.title ?? '',
    column: normalizeColumn(section?.column),
    intro: section?.intro ?? '',
    items: Array.isArray(section?.items)
      ? section.items.map((item: any) => ({
          label: item?.label ?? '',
          text: item?.text ?? ''
        }))
      : []
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
      sections
    }
  };
};

const fetchLang = async (lang: Lang): Promise<WarrantyPagePayload> => {
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

    const tryParse = async (url: string): Promise<WarrantyPagePayload | null> => {
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
    console.warn(`No se pudo cargar Warranty desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, fallback);
};

export const loadWarrantyPageContent = async (): Promise<{ en: WarrantyPagePayload; es: WarrantyPagePayload }> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};
