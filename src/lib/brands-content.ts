import brandsEnMock from '../mocks/brands-page.en.json';
import brandsEsMock from '../mocks/brands-page.es.json';

export interface BrandsImage {
  url?: string;
  alt?: string;
}

export interface BrandLogo {
  key?: string;
  placeholder_text?: string;
  image?: BrandsImage | null;
}

export interface BrandsCta {
  label?: string;
  url?: string;
}

export interface BrandsCopy {
  // Indexed access lets brands.astro's `cp(key)` helper look up any of the
  // named keys below by a dynamic string without a TS7053 error.
  [key: string]: string | undefined;
  projects_eyebrow?: string;
  projects_heading?: string;
  projects_cta?: string;
  projects_prev_aria?: string;
  projects_next_aria?: string;
  projects_carousel_aria?: string;
  projects_dot_aria?: string;
  about_eyebrow?: string;
  about_heading?: string;
  about_body_1?: string;
  about_body_2?: string;
  about_brands_label?: string;
  about_cta?: string;
  team_eyebrow?: string;
  team_heading?: string;
  values_eyebrow?: string;
  values_heading?: string;
  values_prev_aria?: string;
  values_next_aria?: string;
  values_carousel_aria?: string;
  values_dot_aria?: string;
}

export interface BrandsProject {
  title?: string;
  slug?: string;
  thumbnail?: BrandsImage;
  description?: string;
}

export interface BrandsAboutLink {
  label?: string;
  url?: string;
}

export interface BrandsTeamMember {
  name?: string;
  role?: string;
  photo?: BrandsImage;
  bio?: string;
}

export interface BrandsValueSlide {
  title?: string;
  image?: BrandsImage;
  description?: string;
}

export interface BrandsPagePayload {
  type?: string;
  title?: string;
  locale?: 'en' | 'es';
  meta: {
    seo_title?: string;
    search_description?: string;
  };
  fields: {
    brand_logos: BrandLogo[];
    banner_image?: BrandsImage;
    banner_heading?: string;
    banner_cta?: BrandsCta;
    copy: BrandsCopy;
    featured_projects: BrandsProject[];
    about_image?: BrandsImage;
    about_links: BrandsAboutLink[];
    team_members: BrandsTeamMember[];
    values_slides: BrandsValueSlide[];
  };
}

type Lang = 'en' | 'es';

const mocks: Record<Lang, BrandsPagePayload> = {
  en: brandsEnMock as BrandsPagePayload,
  es: brandsEsMock as BrandsPagePayload
};

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = import.meta.env.PUBLIC_BRANDS_API_URL || '';
const apiOrigin = apiUrl && apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';

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

const toPayload = (source: any, isRemote: boolean, fallback: BrandsPagePayload): BrandsPagePayload => {
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

  const bannerImageSource = fields.banner_image ?? fallbackFields.banner_image;

  const projectsSource = Array.isArray(fields.featured_projects) && fields.featured_projects.length
    ? fields.featured_projects
    : (fallbackFields.featured_projects ?? []);
  const featuredProjects = projectsSource.map((project: any) => ({
    title: project?.title ?? '',
    slug: project?.slug ?? '',
    thumbnail: normalizeImage(project?.thumbnail, isRemote),
    description: project?.description ?? ''
  }));

  const aboutImageSource = fields.about_image ?? fallbackFields.about_image;

  const aboutLinksSource = Array.isArray(fields.about_links) && fields.about_links.length
    ? fields.about_links
    : (fallbackFields.about_links ?? []);
  const aboutLinks = aboutLinksSource.map((link: any) => ({
    label: link?.label ?? '',
    url: link?.url ?? '#'
  }));

  const teamSource = Array.isArray(fields.team_members) && fields.team_members.length
    ? fields.team_members
    : (fallbackFields.team_members ?? []);
  const teamMembers = teamSource.map((member: any) => ({
    name: member?.name ?? '',
    role: member?.role ?? '',
    photo: normalizeImage(member?.photo, isRemote),
    bio: member?.bio ?? ''
  }));

  const valuesSource = Array.isArray(fields.values_slides) && fields.values_slides.length
    ? fields.values_slides
    : (fallbackFields.values_slides ?? []);
  const valuesSlides = valuesSource.map((slide: any) => ({
    title: slide?.title ?? '',
    image: normalizeImage(slide?.image, isRemote),
    description: slide?.description ?? ''
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
      brand_logos: brandLogos,
      banner_image: normalizeImage(bannerImageSource, isRemote && Boolean(fields.banner_image)),
      banner_heading: fields.banner_heading ?? fallbackFields.banner_heading ?? '',
      banner_cta: {
        label: fields.banner_cta?.label ?? fallbackFields.banner_cta?.label ?? '',
        url: fields.banner_cta?.url ?? fallbackFields.banner_cta?.url ?? '#'
      },
      copy: {
        ...(fallbackFields.copy ?? {}),
        ...(fields.copy ?? {})
      },
      featured_projects: featuredProjects,
      about_image: normalizeImage(aboutImageSource, isRemote && Boolean(fields.about_image)),
      about_links: aboutLinks,
      team_members: teamMembers,
      values_slides: valuesSlides
    }
  };
};

const fetchLang = async (lang: Lang): Promise<BrandsPagePayload> => {
  const fallback = mocks[lang];
  if (!useApi || !apiUrl) return toPayload(fallback, false, fallback);

  let requestUrl = apiUrl;
  try {
    const url = new URL(apiUrl);
    url.searchParams.set('locale', lang);
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
    console.warn(`No se pudo cargar Brands desde ${requestUrl}. Usando mock local.`, error);
  }

  return toPayload(fallback, false, fallback);
};

export const loadBrandsPageContent = async (): Promise<{ en: BrandsPagePayload; es: BrandsPagePayload }> => {
  const [en, es] = await Promise.all([fetchLang('en'), fetchLang('es')]);
  return { en, es };
};
