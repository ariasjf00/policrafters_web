import directContactEnMock from '../mocks/direct-contact.en.json';
import directContactEsMock from '../mocks/direct-contact.es.json';

// Shared shaping for the "direct contact" block, so any page can feed DirectContact.astro.
// The section is treated as a standalone content source: pages ask for it once and
// render the returned English and Spanish payloads without depending on page data.

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

type Lang = 'en' | 'es';

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

/* Both languages for a page that has already resolved one of them — the usual case,
   since pages fetch their endpoint for the active language at build time. The other
   language falls back to its mock, which is the same source the client-side
   re-render has always used to switch without a reload. */
export const buildDirectContact = (
  resolved: any,
  resolvedLang: Lang
): { en: DirectContactPayload; es: DirectContactPayload } => ({
  en: resolvedLang === 'en' && resolved ? toDirectContactPayload(resolved, mocks.en) : mocks.en,
  es: resolvedLang === 'es' && resolved ? toDirectContactPayload(resolved, mocks.es) : mocks.es
});

export const loadDirectContact = async (): Promise<{ en: DirectContactPayload; es: DirectContactPayload }> => {
  const useApi = import.meta.env.PUBLIC_USE_API === 'true';
  const apiUrl = import.meta.env.PUBLIC_DIRECT_CONTACT_API_URL || '';

  if (!useApi || !apiUrl) {
    return { en: mocks.en, es: mocks.es };
  }

  const fetchLocalized = async (lang: Lang): Promise<DirectContactPayload> => {
    try {
      const url = new URL(apiUrl);
      url.searchParams.set('lang', lang);
      const response = await fetch(url.toString());

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

  const [en, es] = await Promise.all([fetchLocalized('en'), fetchLocalized('es')]);

  return { en, es };
};
