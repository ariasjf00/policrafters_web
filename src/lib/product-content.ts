import productEnMock from '../mocks/product-page.en.json';
import productEsMock from '../mocks/product-page.es.json';

// Shared loader for the product detail page (/collections/product), following the
// same shape as contact-content.ts and catalogs.ts.
//
// Unlike the old single product-page.json (Spanish-base + `_en` sibling keys), each
// mock here is a genuinely single-language payload, matching the API contract's
// general rule. The frontend fetches BOTH languages at build time — this page ships
// every string twice (data-copy-es/-en) so Header's toggle can switch it without a
// reload, which means one localized response is not enough.

export interface ProductImage {
  url?: string;
  alt?: string;
}

export interface DownloadLink {
  label?: string;
  url?: string;
}

export interface ProductCollection {
  name?: string;
  slug?: string;
}

export interface RelatedModel {
  title?: string;
  slug?: string;
  thumbnail?: ProductImage;
}

export interface ProductPageFields {
  hero_image?: ProductImage;
  intro_text_1?: string;
  secondary_image?: ProductImage;
  intro_text_2?: string;
  gallery_pair?: ProductImage[];
  product_eyebrow?: string;
  product_heading?: string;
  product_body?: string;
  technical_eyebrow?: string;
  technical_image_product?: ProductImage;
  technical_image_dimensions?: ProductImage;
  download_heading?: string;
  download_links?: DownloadLink[];
  collection?: ProductCollection;
  related_models?: RelatedModel[];
  back_to_menu_label?: string;
}

export interface ProductPagePayload {
  title?: string;
  slug?: string;
  meta: { seo_title?: string; search_description?: string };
  fields: ProductPageFields;
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, any> = { en: productEnMock, es: productEsMock };

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = import.meta.env.PUBLIC_PRODUCT_API_URL || '';
const apiOrigin = apiUrl && apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';

const buildRequestUrl = (lang: Lang, slug?: string): string => {
  if (!apiUrl) return apiUrl;

  try {
    const url = new URL(apiUrl);
    url.searchParams.set('lang', lang);
    if (slug) {
      url.searchParams.set('slug', slug);
    }
    return url.toString();
  } catch {
    if (slug) {
      const separator = apiUrl.includes('?') ? '&' : '?';
      return `${apiUrl}${separator}lang=${lang}&slug=${encodeURIComponent(slug)}`;
    }
    return `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}lang=${lang}`;
  }
};

// CMS image paths come back host-relative and need the API origin prepended;
// identical-looking /images/... paths from public/ must be left alone. Only values
// known to have come from the API reach this.
const normalizeAssetUrl = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && apiOrigin) return `${apiOrigin}${value}`;
  return value;
};

// Per-key fallback, same as the location.image handling in contact-content.ts:
// a partial CMS image never blanks the picture, it just falls back to the mock's.
const normalizeImage = (image: any, fallbackImage: any, isRemote: boolean): ProductImage => {
  const url = image?.url || fallbackImage?.url || '';
  return {
    url: isRemote ? normalizeAssetUrl(url) : url,
    alt: image?.alt || fallbackImage?.alt || ''
  };
};

const toPayload = (source: any, isRemote: boolean, fallback: any): ProductPagePayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback?.fields ?? {};

  const galleryPair: ProductImage[] = Array.isArray(fields.gallery_pair) && fields.gallery_pair.length
    ? fields.gallery_pair
    : (fallbackFields.gallery_pair ?? []);

  const downloadLinks: DownloadLink[] = Array.isArray(fields.download_links) && fields.download_links.length
    ? fields.download_links
    : (fallbackFields.download_links ?? []);

  const relatedModels: RelatedModel[] = Array.isArray(fields.related_models) && fields.related_models.length
    ? fields.related_models
    : (fallbackFields.related_models ?? []);

  return {
    title: source?.title || fallback?.title || '',
    slug: source?.slug || fallback?.slug || '',
    meta: { ...(fallback?.meta ?? {}), ...(source?.meta ?? {}) },
    fields: {
      hero_image: normalizeImage(fields.hero_image, fallbackFields.hero_image, isRemote),
      intro_text_1: fields.intro_text_1 || fallbackFields.intro_text_1 || '',
      secondary_image: normalizeImage(fields.secondary_image, fallbackFields.secondary_image, isRemote),
      intro_text_2: fields.intro_text_2 || fallbackFields.intro_text_2 || '',
      gallery_pair: galleryPair.map((image) => normalizeImage(image, null, isRemote)),
      product_eyebrow: fields.product_eyebrow || fallbackFields.product_eyebrow || '',
      product_heading: fields.product_heading || fallbackFields.product_heading || '',
      product_body: fields.product_body || fallbackFields.product_body || '',
      technical_eyebrow: fields.technical_eyebrow || fallbackFields.technical_eyebrow || '',
      technical_image_product: normalizeImage(fields.technical_image_product, fallbackFields.technical_image_product, isRemote),
      technical_image_dimensions: normalizeImage(fields.technical_image_dimensions, fallbackFields.technical_image_dimensions, isRemote),
      download_heading: fields.download_heading || fallbackFields.download_heading || '',
      download_links: downloadLinks,
      collection: { ...(fallbackFields.collection ?? {}), ...(fields.collection ?? {}) },
      related_models: relatedModels.map((model: any) => ({
        ...model,
        thumbnail: normalizeImage(model?.thumbnail, null, isRemote)
      })),
      back_to_menu_label: fields.back_to_menu_label || fallbackFields.back_to_menu_label || ''
    }
  };
};

const fetchLang = async (lang: Lang, slug?: string): Promise<ProductPagePayload> => {
  const fallback = mocks[lang];
  if (!useApi || !apiUrl) return toPayload(fallback, false, fallback);

  const requestUrl = buildRequestUrl(lang, slug);

  try {
    const response = await fetch(requestUrl);
    if (response.ok) {
      const payload = await response.json();
      if (payload && typeof payload === 'object') return toPayload(payload, true, fallback);
    }
  } catch (error) {
    console.warn(`No se pudo cargar ModelPage desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, false, fallback);
};

export const loadProductPageContent = async (slug?: string): Promise<{ en: ProductPagePayload; es: ProductPagePayload }> => {
  const [en, es] = await Promise.all([fetchLang('en', slug), fetchLang('es', slug)]);
  return { en, es };
};
