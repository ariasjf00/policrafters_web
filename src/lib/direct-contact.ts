import directContactEnMock from '../mocks/direct-contact.en.json';
import directContactEsMock from '../mocks/direct-contact.es.json';
import { toDevApiUrl } from './dev-proxy';
import { type Lang, withLocaleParam } from './i18n';

// Shared shaping for the "direct contact" block, so any page can feed DirectContact.astro.
// The section is treated as a standalone content source: pages ask for it once, in
// their own language, without depending on page data.

export interface DirectContactCopy {
  contact_heading?: string;
  contact_cta?: string;
}

export interface DirectContactItem {
  title?: string;
  description?: string;
  url?: string;
}

export interface DirectContactPayload {
  copy: DirectContactCopy;
  items: DirectContactItem[];
}

const mocks: Record<Lang, DirectContactPayload> = {
  en: {
    copy: {
      contact_heading: directContactEnMock?.fields?.copy?.contact_heading ?? '',
      contact_cta: directContactEnMock?.fields?.copy?.contact_cta ?? ''
    },
    items: Array.isArray(directContactEnMock?.fields?.contact_links)
      ? directContactEnMock.fields.contact_links.map((item: any) => ({
          title: item?.title ?? '',
          description: item?.description ?? '',
          url: item?.url || '#'
        }))
      : []
  },
  es: {
    copy: {
      contact_heading: directContactEsMock?.fields?.copy?.contact_heading ?? '',
      contact_cta: directContactEsMock?.fields?.copy?.contact_cta ?? ''
    },
    items: Array.isArray(directContactEsMock?.fields?.contact_links)
      ? directContactEsMock.fields.contact_links.map((item: any) => ({
          title: item?.title ?? '',
          description: item?.description ?? '',
          url: item?.url || '#'
        }))
      : []
  }
};

/* Shapes a home-style payload ({ fields: { copy, contact_links } }) into the
   component's props. `fallback` fills per key, matching the per-key fallback the
   pages use — a partial CMS payload never blanks the section. */
export const toDirectContactPayload = (source: any, fallback: any = null): DirectContactPayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback?.fields ?? {};
  const items: DirectContactItem[] = Array.isArray(fields.contact_links) && fields.contact_links.length
    ? fields.contact_links
    : (fallbackFields.contact_links ?? []);
  const copy = { ...(fallbackFields.copy ?? {}), ...(fields.copy ?? {}) };

  return {
    copy: {
      contact_heading: copy.contact_heading ?? '',
      contact_cta: copy.contact_cta ?? ''
    },
    items: items.map((item: any) => ({
      title: item?.title ?? '',
      description: item?.description ?? '',
      url: item?.url || '#'
    }))
  };
};

const hasPreviewFlag = (value: string | null | undefined): boolean => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const isPreviewRequest = (search?: string | URLSearchParams | null): boolean => {
  if (!search) {
    if (typeof window === 'undefined') return false;
    return hasPreviewFlag(new URLSearchParams(window.location.search).get('preview'));
  }

  if (typeof search === 'string') {
    return hasPreviewFlag(new URLSearchParams(search).get('preview'));
  }

  return hasPreviewFlag(search.get('preview'));
};

export const loadDirectContact = async (lang: Lang): Promise<DirectContactPayload> => {
  const useApi = import.meta.env.PUBLIC_USE_API === 'true';
  const apiUrl = toDevApiUrl(import.meta.env.PUBLIC_DIRECT_CONTACT_API_URL || '', 'server');

  if (!useApi || !apiUrl) {
    return mocks[lang];
  }

  const previewRuntime = isPreviewRequest(typeof window !== 'undefined' ? window.location.search : '');
  const runtimeMode = previewRuntime ? 'no-store' : 'default';
  // withLocaleParam sets both `locale` (the unified param) and `lang` (the
  // alias the current API still reads) — see Docs/API_CONTRACT.md.
  const requestUrl = withLocaleParam(apiUrl, lang);

  if (import.meta.env.DEV) {
    console.debug('[direct-contact]', {
      preview: previewRuntime,
      source: previewRuntime ? 'runtime' : 'static',
      endpoint: requestUrl,
      lang,
      cache: runtimeMode
    });
  }

  try {
    const response = await fetch(requestUrl, {
      cache: runtimeMode,
      headers: { 'Cache-Control': runtimeMode === 'no-store' ? 'no-cache, no-store, must-revalidate' : 'max-age=300' }
    });

    if (!response.ok) {
      return mocks[lang];
    }

    const payload = await response.json();
    if (payload && typeof payload === 'object') {
      return toDirectContactPayload(payload, mocks[lang]);
    }
  } catch {
    // Keep the section functional when the dedicated endpoint is missing.
  }

  return mocks[lang];
};
