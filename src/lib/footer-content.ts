import footerEnMock from '../mocks/footer.en.json';
import footerEsMock from '../mocks/footer.es.json';
import { toDevApiUrl } from './dev-proxy';
import { type Lang, localizePath, withLocaleParam } from './i18n';

export interface FooterLink {
  key: string;
  label: string;
  href: string;
  icon?: string;
}

export interface FooterCopy {
  blurb_1: string;
  blurb_2: string;
  phone_label: string;
  residential_label: string;
  email_label: string;
  commercial_label: string;
  address_label: string;
  social_label: string;
  copyright_text: string;
}

export interface FooterContent {
  copy: FooterCopy;
  navigation_links: FooterLink[];
  residential_links: FooterLink[];
  commercial_links: FooterLink[];
  social_links: FooterLink[];
}

const mocks: Record<Lang, FooterContent> = {
  en: footerEnMock.fields as FooterContent,
  es: footerEsMock.fields as FooterContent
};

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = toDevApiUrl(import.meta.env.PUBLIC_FOOTER_API_URL || '', 'server');

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const getLinkPath = (source: Record<string, unknown>, fallback: FooterLink, lang: Lang): string => {
  const localizedPath = source.localizedPath ?? source.localized_path;
  if (typeof localizedPath === 'string') return localizedPath;

  const href = typeof source.href === 'string' ? source.href : fallback.href;
  return localizePath(href, lang);
};

const normalizeLinks = (source: unknown, fallback: FooterLink[], lang: Lang): FooterLink[] => {
  if (!Array.isArray(source) || source.length === 0) return fallback;

  return (source as unknown[]).map((item: unknown, index: number) => {
    const link = asRecord(item) ?? {};
    const defaultLink = fallback[index] ?? { key: `footer-link-${index + 1}`, label: '', href: '#' };

    return {
      key: typeof link.key === 'string' ? link.key : defaultLink.key,
      label: typeof link.label === 'string' ? link.label : defaultLink.label,
      href: getLinkPath(link, defaultLink, lang),
      ...(typeof link.icon === 'string' ? { icon: link.icon } : defaultLink.icon ? { icon: defaultLink.icon } : {})
    };
  });
};

const toFooterContent = (source: unknown, fallback: FooterContent, lang: Lang): FooterContent => {
  const page = asRecord(source);
  const fields = asRecord(page?.fields) ?? page ?? {};
  const copy = asRecord(fields.copy) ?? {};
  const resolvedCopy = Object.fromEntries(
    Object.entries(fallback.copy).map(([key, defaultValue]) => [
      key,
      typeof copy[key] === 'string' ? copy[key] : defaultValue
    ])
  ) as FooterCopy;

  return {
    copy: resolvedCopy,
    navigation_links: normalizeLinks(fields.navigation_links, fallback.navigation_links, lang),
    residential_links: normalizeLinks(fields.residential_links, fallback.residential_links, lang),
    commercial_links: normalizeLinks(fields.commercial_links, fallback.commercial_links, lang),
    social_links: normalizeLinks(fields.social_links, fallback.social_links, lang)
  };
};

const fetchLang = async (lang: Lang): Promise<FooterContent> => {
  const fallback = mocks[lang];
  if (!useApi || !apiUrl) return toFooterContent(fallback, fallback, lang);

  const requestUrl = withLocaleParam(apiUrl, lang);

  try {
    const response = await fetch(requestUrl);
    if (response.ok) {
      const payload: unknown = await response.json();
      const result = asRecord(payload);
      const items = result?.items;
      const results = result?.results;
      const unwrapped = Array.isArray(items)
        ? items[0]
        : Array.isArray(results)
          ? results[0]
          : payload;

      if (asRecord(unwrapped)) {
        return toFooterContent(unwrapped, fallback, lang);
      }
    }
  } catch (error) {
    console.warn(`No se pudo cargar Footer desde ${requestUrl}. Usando mock local.`, error);
  }

  return toFooterContent(fallback, fallback, lang);
};

const cache = new Map<Lang, Promise<FooterContent>>();

export const loadFooterContent = (lang: Lang): Promise<FooterContent> => {
  let pending = cache.get(lang);
  if (!pending) {
    pending = fetchLang(lang);
    cache.set(lang, pending);
  }
  return pending;
};
