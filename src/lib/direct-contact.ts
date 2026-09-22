import homeEnMock from '../mocks/home.en.json';
import homeEsMock from '../mocks/home.es.json';

// Shared shaping for the "direct contact" block, so any page can feed DirectContact.astro.
//
// Unlike catalogs, this content has no endpoint of its own: it rides along in the
// home payload (fields.contact_links plus copy.contact_heading / copy.contact_cta).
// The component ships every string in the markup twice (data-copy-es/-en) so
// Header's toggle can switch it without a reload, which means a page has to hand it
// BOTH languages — one localized response is not enough.

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

const mocks: Record<Lang, any> = { en: homeEnMock, es: homeEsMock };

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
  en: toDirectContactPayload(resolvedLang === 'en' ? resolved : mocks.en, mocks.en),
  es: toDirectContactPayload(resolvedLang === 'es' ? resolved : mocks.es, mocks.es)
});
