import financeEnMock from '../mocks/finance-page.en.json';
import financeEsMock from '../mocks/finance-page.es.json';
import { toDevApiUrl } from './dev-proxy';

export interface FinanceImage {
  url?: string;
  alt?: string;
}

export interface FinanceStep {
  key?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  column?: 'left' | 'right';
}

export interface FinanceContact {
  heading?: string;
  phone_display?: string;
  phone_href?: string;
  email_label?: string;
  email?: string;
}

export interface FinancePagePayload {
  type?: string;
  title?: string;
  locale?: 'en' | 'es';
  meta: {
    seo_title?: string;
    search_description?: string;
  };
  fields: {
    hero_image?: FinanceImage;
    intro_heading?: string;
    intro_body?: string;
    steps: FinanceStep[];
    contact?: FinanceContact;
  };
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, FinancePagePayload> = {
  en: financeEnMock as FinancePagePayload,
  es: financeEsMock as FinancePagePayload
};

const hasEnabledFlag = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const useApi = hasEnabledFlag(import.meta.env.PUBLIC_USE_API);
const apiUrl = toDevApiUrl(import.meta.env.PUBLIC_FINANCE_API_URL || '', 'server');
const apiOrigin = apiUrl && apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';

// `column` only ever comes from the EN payload (see toPayload below) and is
// language-independent, so it's normalized once here rather than per-locale.
// Same rule as warranty-content.ts.
const normalizeColumn = (value: unknown): 'left' | 'right' | undefined => {
  return value === 'left' || value === 'right' ? value : undefined;
};

// CMS image paths come back host-relative and need the API origin prepended;
// identical-looking /images/... paths from public/ must be left alone. Only
// values known to have come from the API (isRemote) reach the prefixing
// branch — see services-content.ts for the same helper.
const normalizeAssetUrl = (value: unknown, isRemote: boolean): string => {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && isRemote) return apiOrigin ? `${apiOrigin}${value}` : value;
  return value;
};

const toPayload = (source: any, isRemote: boolean, fallback: FinancePagePayload): FinancePagePayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback.fields ?? {};

  const stepsSource = Array.isArray(fields.steps) && fields.steps.length
    ? fields.steps
    : (fallbackFields.steps ?? []);
  const steps: FinanceStep[] = stepsSource.map((step: any) => ({
    key: step?.key ?? '',
    title: step?.title ?? '',
    subtitle: step?.subtitle ?? '',
    body: step?.body ?? '',
    column: normalizeColumn(step?.column)
  }));

  const heroImageSource = fields.hero_image ?? fallbackFields.hero_image;
  const contactSource = fields.contact ?? fallbackFields.contact ?? {};
  const fallbackContact = fallbackFields.contact ?? {};

  return {
    type: source?.type ?? fallback.type,
    title: source?.title ?? fallback.title,
    locale: source?.locale ?? fallback.locale,
    meta: {
      ...(fallback.meta ?? {}),
      ...(source?.meta ?? {})
    },
    fields: {
      hero_image: {
        url: normalizeAssetUrl(heroImageSource?.url, isRemote && Boolean(fields.hero_image)),
        alt: heroImageSource?.alt ?? ''
      },
      intro_heading: fields.intro_heading ?? fallbackFields.intro_heading ?? '',
      intro_body: fields.intro_body ?? fallbackFields.intro_body ?? '',
      steps,
      contact: {
        heading: contactSource.heading ?? fallbackContact.heading ?? '',
        phone_display: contactSource.phone_display ?? fallbackContact.phone_display ?? '',
        phone_href: contactSource.phone_href ?? fallbackContact.phone_href ?? '',
        email_label: contactSource.email_label ?? fallbackContact.email_label ?? '',
        email: contactSource.email ?? fallbackContact.email ?? ''
      }
    }
  };
};

const fetchLang = async (lang: Lang): Promise<FinancePagePayload> => {
  const fallback = mocks[lang];
  if (!useApi || !apiUrl) return toPayload(fallback, false, fallback);

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

    const tryParse = async (url: string): Promise<FinancePagePayload | null> => {
      const response = await fetch(url);
      if (!response.ok) return null;
      const raw = await response.json();
      const payload = unwrapPayload(raw);
      return payload && typeof payload === 'object' ? toPayload(payload, true, fallback) : null;
    };

    const fromLocale = await tryParse(requestUrl);
    if (fromLocale) return fromLocale;

    const fromLang = await tryParse(legacyLangUrl);
    if (fromLang) return fromLang;
  } catch (error) {
    console.warn(`No se pudo cargar Finance desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, false, fallback);
};

export const loadFinancePageContent = async (): Promise<{ en: FinancePagePayload; es: FinancePagePayload }> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};
