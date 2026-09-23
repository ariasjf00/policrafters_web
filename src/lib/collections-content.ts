import collectionsEnMock from '../mocks/collections-page.en.json';
import collectionsEsMock from '../mocks/collections-page.es.json';

export interface CollectionProductImage {
  url?: string;
  alt?: string;
}

export interface CollectionProduct {
  title?: string;
  slug?: string;
  image?: CollectionProductImage;
}

export interface CollectionType {
  key?: string;
  label?: string;
  products?: CollectionProduct[];
}

export interface CollectionCategory {
  key?: string;
  label?: string;
  has_products?: boolean;
  types?: CollectionType[];
}

export interface CollectionPagePayload {
  type?: string;
  title?: string;
  locale?: 'en' | 'es';
  meta: {
    seo_title?: string;
    search_description?: string;
  };
  fields: {
    hero_title?: string;
    intro_text?: string;
    empty_state_text?: string;
    categories: CollectionCategory[];
  };
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, CollectionPagePayload> = {
  en: collectionsEnMock as CollectionPagePayload,
  es: collectionsEsMock as CollectionPagePayload
};

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = import.meta.env.PUBLIC_COLLECTIONS_API_URL || '';
const apiOrigin = apiUrl && apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';

const normalizeAssetUrl = (value: unknown, isRemote: boolean): string => {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && isRemote) return apiOrigin ? `${apiOrigin}${value}` : value;
  return value;
};

const toPayload = (source: any, isRemote: boolean, fallback: CollectionPagePayload): CollectionPagePayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback.fields ?? {};
  const categoriesSource = Array.isArray(fields.categories) && fields.categories.length
    ? fields.categories
    : (fallbackFields.categories ?? []);

  const categories = categoriesSource.map((category: any) => ({
    ...category,
    types: Array.isArray(category.types)
      ? category.types.map((type: any) => ({
          ...type,
          products: Array.isArray(type.products)
            ? type.products.map((product: any) => ({
                ...product,
                image: {
                  url: normalizeAssetUrl(product?.image?.url, isRemote),
                  alt: product?.image?.alt ?? ''
                }
              }))
            : []
        }))
      : []
  }));

  return {
    type: source?.type ?? fallback.type,
    title: source?.title ?? fallback.title,
    locale: source?.locale ?? fallback.locale,
    meta: {
      ...(fallback.meta ?? {}),
      ...(source?.meta ?? {})
    },
    fields: {
      hero_title: fields.hero_title ?? fallbackFields.hero_title ?? '',
      intro_text: fields.intro_text ?? fallbackFields.intro_text ?? '',
      empty_state_text: fields.empty_state_text ?? fallbackFields.empty_state_text ?? '',
      categories
    }
  };
};

const fetchLang = async (lang: Lang): Promise<CollectionPagePayload> => {
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
    console.warn(`No se pudo cargar Collections desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, false, fallback);
};

export const loadCollectionsPageContent = async (): Promise<{ en: CollectionPagePayload; es: CollectionPagePayload }> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};