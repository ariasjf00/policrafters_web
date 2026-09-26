import servicesEnMock from '../mocks/services-page.en.json';
import servicesEsMock from '../mocks/services-page.es.json';

export interface ServicesImage {
  url?: string;
  alt?: string;
}

export interface ServiceBlock {
  key?: string;
  heading?: string;
  subtitle?: string;
  body?: string[];
  image?: ServicesImage;
}

export interface ServicesPagePayload {
  type?: string;
  title?: string;
  locale?: 'en' | 'es';
  meta: {
    seo_title?: string;
    search_description?: string;
  };
  fields: {
    hero_image?: ServicesImage;
    intro_eyebrow?: string;
    intro_heading?: string;
    intro_text?: string;
    services: ServiceBlock[];
  };
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, ServicesPagePayload> = {
  en: servicesEnMock as ServicesPagePayload,
  es: servicesEsMock as ServicesPagePayload
};

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = import.meta.env.PUBLIC_SERVICES_API_URL || '';
const apiOrigin = apiUrl && apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';

// CMS image paths come back host-relative and need the API origin prepended;
// identical-looking /images/... paths from public/ must be left alone. Only values
// known to have come from the API (isRemote) reach the prefixing branch.
const normalizeAssetUrl = (value: unknown, isRemote: boolean): string => {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && isRemote) return apiOrigin ? `${apiOrigin}${value}` : value;
  return value;
};

const toPayload = (source: any, isRemote: boolean, fallback: ServicesPagePayload): ServicesPagePayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback.fields ?? {};
  const servicesSource = Array.isArray(fields.services) && fields.services.length
    ? fields.services
    : (fallbackFields.services ?? []);

  const services = servicesSource.map((service: any) => ({
    ...service,
    body: Array.isArray(service.body) ? service.body : [],
    image: {
      url: normalizeAssetUrl(service?.image?.url, isRemote),
      alt: service?.image?.alt ?? ''
    }
  }));

  const heroImageSource = fields.hero_image ?? fallbackFields.hero_image;

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
      intro_eyebrow: fields.intro_eyebrow ?? fallbackFields.intro_eyebrow ?? '',
      intro_heading: fields.intro_heading ?? fallbackFields.intro_heading ?? '',
      intro_text: fields.intro_text ?? fallbackFields.intro_text ?? '',
      services
    }
  };
};

const fetchLang = async (lang: Lang): Promise<ServicesPagePayload> => {
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

    const tryParse = async (url: string): Promise<ServicesPagePayload | null> => {
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
    console.warn(`No se pudo cargar Services desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, false, fallback);
};

export const loadServicesPageContent = async (): Promise<{ en: ServicesPagePayload; es: ServicesPagePayload }> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};
