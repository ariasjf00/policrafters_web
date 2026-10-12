import whyPolicraftersEnMock from '../mocks/why-policrafters-page.en.json';
import whyPolicraftersEsMock from '../mocks/why-policrafters-page.es.json';

export interface WhyPolicraftersImage {
  url?: string;
  alt?: string;
}

export interface WhyPolicraftersTextBlock {
  key?: string;
  heading?: string;
  body: string[];
}

export interface WhyPolicraftersLicense {
  label?: string;
  number?: string;
  caption?: string;
}

export interface WhyPolicraftersIssuer {
  key?: string;
  logo?: WhyPolicraftersImage;
  licenses: WhyPolicraftersLicense[];
}

export interface WhyPolicraftersPartner {
  key?: string;
  logo?: WhyPolicraftersImage;
  image?: WhyPolicraftersImage;
  body: string[];
}

export interface WhyPolicraftersPagePayload {
  type?: string;
  title?: string;
  locale?: 'en' | 'es';
  meta: {
    seo_title?: string;
    search_description?: string;
  };
  fields: {
    hero_image?: WhyPolicraftersImage;
    intro_eyebrow?: string;
    intro_heading?: string;
    intro_body: string[];

    why_eyebrow?: string;
    why_heading?: string;
    why_items: WhyPolicraftersTextBlock[];

    certifications_image?: WhyPolicraftersImage;
    certifications_eyebrow?: string;
    certifications_heading?: string;
    certifications_body: string[];
    issuers: WhyPolicraftersIssuer[];

    identity_eyebrow?: string;
    identity_heading?: string;
    identity_items: WhyPolicraftersTextBlock[];

    partners_eyebrow?: string;
    partners_heading?: string;
    partners_intro?: string;
    partners: WhyPolicraftersPartner[];
  };
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, WhyPolicraftersPagePayload> = {
  en: whyPolicraftersEnMock as unknown as WhyPolicraftersPagePayload,
  es: whyPolicraftersEsMock as unknown as WhyPolicraftersPagePayload
};

const hasEnabledFlag = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const useApi = hasEnabledFlag(import.meta.env.PUBLIC_USE_API);
const apiUrl = import.meta.env.PUBLIC_WHY_POLICRAFTERS_API_URL || '';
const apiOrigin = apiUrl && apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';

// CMS image paths come back host-relative and need the API origin prepended;
// identical-looking /images/... paths from public/ must be left alone. Only values
// known to have come from the API (isRemote) reach the prefixing branch — same
// rule as services-content.ts's normalizeAssetUrl.
const normalizeAssetUrl = (value: unknown, isRemote: boolean): string => {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && isRemote) return apiOrigin ? `${apiOrigin}${value}` : value;
  return value;
};

const normalizeImage = (source: any, isRemote: boolean): WhyPolicraftersImage => ({
  url: normalizeAssetUrl(source?.url, isRemote),
  alt: source?.alt ?? ''
});

// why_items / identity_items share the same { key, heading, body[] } shape —
// both sections render through the same HeadedTextBlock.astro component.
const normalizeTextBlocks = (source: any, fallback: any): WhyPolicraftersTextBlock[] => {
  const list = Array.isArray(source) && source.length ? source : (fallback ?? []);
  return list.map((item: any) => ({
    key: item?.key ?? '',
    heading: item?.heading ?? '',
    body: Array.isArray(item?.body) ? item.body : []
  }));
};

const normalizeLicenses = (source: any): WhyPolicraftersLicense[] =>
  Array.isArray(source)
    ? source.map((license: any) => ({
        label: license?.label ?? '',
        number: license?.number ?? '',
        caption: license?.caption ?? ''
      }))
    : [];

const normalizeIssuers = (source: any, fallback: any, isRemote: boolean): WhyPolicraftersIssuer[] => {
  const list = Array.isArray(source) && source.length ? source : (fallback ?? []);
  return list.map((issuer: any) => ({
    key: issuer?.key ?? '',
    logo: normalizeImage(issuer?.logo, isRemote),
    licenses: normalizeLicenses(issuer?.licenses)
  }));
};

const normalizePartners = (source: any, fallback: any, isRemote: boolean): WhyPolicraftersPartner[] => {
  const list = Array.isArray(source) && source.length ? source : (fallback ?? []);
  return list.map((partner: any) => ({
    key: partner?.key ?? '',
    logo: normalizeImage(partner?.logo, isRemote),
    image: normalizeImage(partner?.image, isRemote),
    body: Array.isArray(partner?.body) ? partner.body : []
  }));
};

const toPayload = (
  source: any,
  isRemote: boolean,
  fallback: WhyPolicraftersPagePayload
): WhyPolicraftersPagePayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback.fields ?? {};

  return {
    type: source?.type ?? fallback.type,
    title: source?.title ?? fallback.title,
    locale: source?.locale ?? fallback.locale,
    meta: {
      ...(fallback.meta ?? {}),
      ...(source?.meta ?? {})
    },
    fields: {
      hero_image: normalizeImage(fields.hero_image ?? fallbackFields.hero_image, isRemote && Boolean(fields.hero_image)),
      intro_eyebrow: fields.intro_eyebrow ?? fallbackFields.intro_eyebrow ?? '',
      intro_heading: fields.intro_heading ?? fallbackFields.intro_heading ?? '',
      intro_body: Array.isArray(fields.intro_body) && fields.intro_body.length
        ? fields.intro_body
        : (fallbackFields.intro_body ?? []),

      why_eyebrow: fields.why_eyebrow ?? fallbackFields.why_eyebrow ?? '',
      why_heading: fields.why_heading ?? fallbackFields.why_heading ?? '',
      why_items: normalizeTextBlocks(fields.why_items, fallbackFields.why_items),

      certifications_image: normalizeImage(
        fields.certifications_image ?? fallbackFields.certifications_image,
        isRemote && Boolean(fields.certifications_image)
      ),
      certifications_eyebrow: fields.certifications_eyebrow ?? fallbackFields.certifications_eyebrow ?? '',
      certifications_heading: fields.certifications_heading ?? fallbackFields.certifications_heading ?? '',
      certifications_body: Array.isArray(fields.certifications_body) && fields.certifications_body.length
        ? fields.certifications_body
        : (fallbackFields.certifications_body ?? []),
      issuers: normalizeIssuers(fields.issuers, fallbackFields.issuers, isRemote),

      identity_eyebrow: fields.identity_eyebrow ?? fallbackFields.identity_eyebrow ?? '',
      identity_heading: fields.identity_heading ?? fallbackFields.identity_heading ?? '',
      identity_items: normalizeTextBlocks(fields.identity_items, fallbackFields.identity_items),

      partners_eyebrow: fields.partners_eyebrow ?? fallbackFields.partners_eyebrow ?? '',
      partners_heading: fields.partners_heading ?? fallbackFields.partners_heading ?? '',
      partners_intro: fields.partners_intro ?? fallbackFields.partners_intro ?? '',
      partners: normalizePartners(fields.partners, fallbackFields.partners, isRemote)
    }
  };
};

const fetchLang = async (lang: Lang): Promise<WhyPolicraftersPagePayload> => {
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

    const tryParse = async (url: string): Promise<WhyPolicraftersPagePayload | null> => {
      const response = await fetch(url);
      if (!response.ok) return null;
      const raw = await response.json();
      const payload = unwrapPayload(raw);
      return payload && typeof payload === 'object' ? toPayload(payload, true, fallback) : null;
    };

    const fromLocale = await tryParse(requestUrl);
    if (fromLocale) return fromLocale;

    // Backward compatibility while some environments still expect lang.
    const fromLang = await tryParse(legacyLangUrl);
    if (fromLang) return fromLang;
  } catch (error) {
    console.warn(`No se pudo cargar Why Policrafters desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, false, fallback);
};

export const loadWhyPolicraftersPageContent = async (): Promise<{
  en: WhyPolicraftersPagePayload;
  es: WhyPolicraftersPagePayload;
}> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};
