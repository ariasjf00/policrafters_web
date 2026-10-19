import contactEnMock from '../mocks/contact-page.en.json';
import contactEsMock from '../mocks/contact-page.es.json';
import { toDevApiUrl } from './dev-proxy';
import { type Lang, withLocaleParam } from './i18n';

export interface ContactPageCopy {
  heading?: string;
  intro?: string;
  phone_label?: string;
  email_label?: string;
  banner_eyebrow?: string;
  banner_heading?: string;
  project_button_label?: string;
  locations_heading?: string;
  locations_aria?: string;
  learn_more?: string;
}

export interface ContactPageDetails {
  phone_display?: string;
  phone_href?: string;
  email?: string;
  url_contact?: string;
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
  banner_image: { url?: string; alt?: string };
  locations: ContactLocation[];
  meta: { seo_title?: string; search_description?: string };
}

const mocks: Record<Lang, any> = { en: contactEnMock, es: contactEsMock };

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = toDevApiUrl(import.meta.env.PUBLIC_CONTACT_PAGE_API_URL || '', 'server');
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

  // Per-key fallback to the mock, same as everywhere else in this function.
  // normalizeAssetUrl only runs when this field actually came from the API
  // (isRemote && Boolean(fields.banner_image)) — the mock's /images/pages/...
  // path must never be prefixed (see CLAUDE.md and services-content.ts).
  const bannerImageSource = fields.banner_image ?? fallbackFields.banner_image;

  return {
    copy: { ...(fallbackFields.copy ?? {}), ...(fields.copy ?? {}) },
    contact: { ...(fallbackFields.contact ?? {}), ...(fields.contact ?? {}) },
    banner_image: {
      url: isRemote && Boolean(fields.banner_image)
        ? normalizeAssetUrl(bannerImageSource?.url)
        : (bannerImageSource?.url ?? ''),
      alt: bannerImageSource?.alt ?? ''
    },
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

  // withLocaleParam sets both `locale` (the unified param) and `lang` (the
  // alias the current API still reads) — see Docs/API_CONTRACT.md.
  const requestUrl = withLocaleParam(apiUrl, lang);

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

export const loadContactPageContent = async (lang: Lang): Promise<ContactPagePayload> => fetchLang(lang);
