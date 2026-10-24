// Pure builders for the JSON-LD (Schema.org) blocks that SeoHead.astro renders
// inside one @graph. Every builder drops what it doesn't have (see compact()):
// missing CMS data is simply not published, never invented.
import { type Lang, localizePath } from './i18n';
import { absoluteUrl, SITE_NAME } from './seo';
import type { SiteSettings } from './site-settings';

type Json = Record<string, unknown>;

/** Recursively strips undefined/null/""/[]/{} so empty fields never reach the page. */
export function compact<T>(value: T): T | undefined {
  if (Array.isArray(value)) {
    const items = value.map((item) => compact(item)).filter((item) => item !== undefined);
    return (items.length ? items : undefined) as T | undefined;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Json)
      .map(([key, item]) => [key, compact(item)] as const)
      .filter(([, item]) => item !== undefined);
    return (entries.length ? Object.fromEntries(entries) : undefined) as T | undefined;
  }
  if (value === undefined || value === null || value === '') return undefined;
  return value;
}

const clean = (value: Json): Json => (compact(value) ?? {}) as Json;

const siteOrigin = (site: URL | undefined) => absoluteUrl('/', site).replace(/\/$/, '');
const orgId = (site: URL | undefined) => `${siteOrigin(site)}/#organization`;
const pageUrl = (path: string, lang: Lang, site: URL | undefined) => absoluteUrl(localizePath(path, lang), site);

// CMS image URLs reach here already normalized by the loaders (API origin
// prefixed when they came from the API); this only makes the remaining
// host-relative public/ paths absolute.
const absoluteAsset = (url: string | undefined, site: URL | undefined) =>
  url ? (/^https?:\/\//i.test(url) ? url : absoluteUrl(url, site)) : undefined;

const toPostalAddress = (address: SiteSettings['addresses'][number]) =>
  clean({
    '@type': 'PostalAddress',
    streetAddress: address.street,
    addressLocality: address.city,
    addressRegion: address.region,
    postalCode: address.postal_code,
    addressCountry: address.country
  });

export function organizationLd(settings: SiteSettings, site: URL | undefined): Json {
  return clean({
    '@type': 'Organization',
    '@id': orgId(site),
    name: SITE_NAME,
    legalName: settings.legal_name,
    url: `${siteOrigin(site)}/`,
    logo: absoluteAsset(settings.logo.url, site),
    telephone: settings.phone,
    email: settings.email,
    sameAs: settings.social_links
  });
}

export function websiteLd(lang: Lang, site: URL | undefined): Json {
  return clean({
    '@type': 'WebSite',
    '@id': `${siteOrigin(site)}/#website-${lang}`,
    name: SITE_NAME,
    url: pageUrl('/', lang, site),
    inLanguage: lang,
    publisher: { '@id': orgId(site) }
  });
}

export function localBusinessLd(settings: SiteSettings, lang: Lang, site: URL | undefined): Json {
  const [primary, ...others] = settings.addresses.map(toPostalAddress);
  const credentials = [
    settings.license_number
      ? { '@type': 'EducationalOccupationalCredential', name: 'License', credentialCategory: 'license', identifier: settings.license_number }
      : undefined,
    ...settings.certifications.map((cert) => ({
      '@type': 'EducationalOccupationalCredential',
      name: cert.name,
      credentialCategory: 'certification',
      recognizedBy: cert.issuer ? { '@type': 'Organization', name: cert.issuer } : undefined,
      url: cert.url
    }))
  ];

  return clean({
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${pageUrl('/', lang, site)}#localbusiness`,
    name: SITE_NAME,
    url: pageUrl('/', lang, site),
    telephone: settings.phone,
    email: settings.email,
    address: primary,
    location: others.length ? others.map((address) => ({ '@type': 'Place', address })) : undefined,
    openingHours: settings.opening_hours,
    areaServed: settings.area_served,
    hasCredential: credentials,
    image: absoluteAsset(settings.logo.url, site),
    parentOrganization: { '@id': orgId(site) }
  });
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbLd(items: BreadcrumbItem[], lang: Lang, site: URL | undefined): Json {
  return clean({
    '@type': 'BreadcrumbList',
    itemListElement: items
      .filter((item) => item.name && item.path)
      .map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: pageUrl(item.path, lang, site)
      }))
  });
}

/** Localized labels for the fixed breadcrumb steps (never hardcode English on /es pages). */
export const breadcrumbLabels: Record<Lang, { home: string; collections: string; renovations: string; services: string }> = {
  en: { home: 'Home', collections: 'Collections', renovations: 'Renovations', services: 'Services' },
  es: { home: 'Inicio', collections: 'Colecciones', renovations: 'Renovaciones', services: 'Servicios' }
};

export interface ProductLdInput {
  name?: string;
  description?: string;
  images?: (string | undefined)[];
  category?: string;
  path: string;
}

export function productLd(product: ProductLdInput, lang: Lang, site: URL | undefined): Json {
  return clean({
    '@type': 'Product',
    '@id': `${pageUrl(product.path, lang, site)}#product`,
    name: product.name,
    description: product.description,
    url: pageUrl(product.path, lang, site),
    image: (product.images ?? []).map((url) => absoluteAsset(url, site)),
    category: product.category,
    brand: { '@type': 'Brand', name: SITE_NAME },
    manufacturer: { '@id': orgId(site) }
  });
}

export interface ServiceLdInput {
  name?: string;
  description?: string;
}

export function serviceLd(services: ServiceLdInput[], settings: SiteSettings, lang: Lang, site: URL | undefined): Json[] {
  return services
    .filter((service) => service.name)
    .map((service) =>
      clean({
        '@type': 'Service',
        name: service.name,
        description: service.description,
        provider: { '@id': orgId(site) },
        areaServed: settings.area_served,
        url: pageUrl('/services', lang, site)
      })
    );
}
