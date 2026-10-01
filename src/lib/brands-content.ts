import brandsEnMock from '../mocks/brands-header.en.json';
import brandsEsMock from '../mocks/brands-header.es.json';

export interface BrandsImage {
  url?: string;
  alt?: string;
}

export interface BrandLogo {
  key?: string;
  placeholder_text?: string;
  image?: BrandsImage | null;
}

export interface BrandsHeaderPayload {
  type?: string;
  title?: string;
  locale?: 'en' | 'es';
  fields: {
    brand_logos: BrandLogo[];
  };
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, BrandsHeaderPayload> = {
  en: brandsEnMock as BrandsHeaderPayload,
  es: brandsEsMock as BrandsHeaderPayload
};

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = import.meta.env.PUBLIC_BRANDS_API_URL || '';
const apiOrigin = apiUrl && apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';

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

// CMS image paths come back host-relative and need the API origin prepended;
// identical-looking /images/... paths from public/ must be left alone. Only values
// known to have come from the API (isRemote) reach the prefixing branch.
const normalizeAssetUrl = (value: unknown, isRemote: boolean): string => {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && isRemote) return apiOrigin ? `${apiOrigin}${value}` : value;
  return value;
};

const normalizeImage = (source: any, isRemote: boolean): BrandsImage => ({
  url: normalizeAssetUrl(source?.url, isRemote),
  alt: source?.alt ?? ''
});

const toPayload = (source: any, isRemote: boolean, fallback: BrandsHeaderPayload): BrandsHeaderPayload => {
  const fields = source?.fields ?? {};
  const fallbackFields = fallback.fields ?? {};

  const logosSource = Array.isArray(fields.brand_logos) && fields.brand_logos.length
    ? fields.brand_logos
    : (fallbackFields.brand_logos ?? []);
  const brandLogos = logosSource.map((logo: any) => ({
    key: logo?.key ?? '',
    placeholder_text: logo?.placeholder_text ?? '',
    image: logo?.image ? normalizeImage(logo.image, isRemote) : null
  }));

  return {
    type: source?.type ?? fallback.type,
    title: source?.title ?? fallback.title,
    locale: source?.locale ?? fallback.locale,
    fields: {
      brand_logos: brandLogos
    }
  };
};

const fetchLang = async (lang: Lang): Promise<BrandsHeaderPayload> => {
  const fallback = mocks[lang];
  if (!useApi || !apiUrl) return toPayload(fallback, false, fallback);

  const previewRuntime = isPreviewRequest(typeof window !== 'undefined' ? window.location.search : '');
  const runtimeMode = previewRuntime ? 'no-store' : 'default';

  let requestUrl = apiUrl;
  try {
    const url = new URL(apiUrl);
    url.searchParams.set('lang', lang);
    requestUrl = url.toString();
  } catch {
    const separator = apiUrl.includes('?') ? '&' : '?';
    requestUrl = `${apiUrl}${separator}lang=${lang}`;
  }

  if (import.meta.env.DEV) {
    console.debug('[brands-header]', {
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
    if (response.ok) {
      const payload = await response.json();
      if (payload && typeof payload === 'object') return toPayload(payload, true, fallback);
    }
  } catch (error) {
    console.warn(`No se pudo cargar Brands desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, false, fallback);
};

export const loadBrandsPageContent = async (): Promise<{ en: BrandsHeaderPayload; es: BrandsHeaderPayload }> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};
