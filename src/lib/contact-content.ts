import contactEnMock from '../mocks/contact-page.en.json';
import contactEsMock from '../mocks/contact-page.es.json';

export interface ContactPageCopy {
  heading?: string;
  intro?: string;
  phone_label?: string;
  email_label?: string;
  locations_heading?: string;
  locations_aria?: string;
  learn_more?: string;
}

export interface ContactPageDetails {
  phone_display?: string;
  phone_href?: string;
  email?: string;
}

export interface ContactLocation {
  name?: string;
  address_label?: string;
  street?: string;
  city?: string;
  url?: string;
  image?: { url?: string; alt?: string };
}

export interface ContactPagePayload {
  copy: ContactPageCopy;
  contact: ContactPageDetails;
  locations: ContactLocation[];
  meta: { seo_title?: string; search_description?: string };
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, any> = { en: contactEnMock, es: contactEsMock };

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = import.meta.env.PUBLIC_CONTACT_PAGE_API_URL || '';
const apiOrigin = apiUrl && apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';

const normalizeAssetUrl = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && apiOrigin) return `${apiOrigin}${value}`;
  return value;
};

const toPayload = (source: any, isRemote: boolean, fallback: any): ContactPagePayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback?.fields ?? {};
  const locations: ContactLocation[] = Array.isArray(fields.locations) && fields.locations.length
    ? fields.locations
    : (fallbackFields.locations ?? []);

  return {
    copy: { ...(fallbackFields.copy ?? {}), ...(fields.copy ?? {}) },
    contact: { ...(fallbackFields.contact ?? {}), ...(fields.contact ?? {}) },
    locations: locations.map((location) => ({
      ...location,
      image: {
        url: isRemote ? normalizeAssetUrl(location.image?.url) : (location.image?.url ?? ''),
        alt: location.image?.alt ?? ''
      }
    })),
    meta: { ...(fallback?.meta ?? {}), ...(source?.meta ?? {}) }
  };
};

const fetchLang = async (lang: Lang): Promise<ContactPagePayload> => {
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
    console.warn(`No se pudo cargar ContactPage desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, false, fallback);
};

export const loadContactPageContent = async (): Promise<{ en: ContactPagePayload; es: ContactPagePayload }> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};
