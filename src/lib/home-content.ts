import homeEnMock from '../mocks/home.en.json';
import homeEsMock from '../mocks/home.es.json';
import { type Lang, withLocaleParam } from './i18n';

// Same pattern as every other *-content.ts loader: build-time fetch, fall back
// to the mock on any failure, one language per call. Previously inlined in
// index.astro's frontmatter — moved here so the homepage follows the same
// shape as the rest of the site (see Docs/API_CONTRACT.md § HomePage).
const mocks: Record<Lang, any> = { en: homeEnMock, es: homeEsMock };

const useApi = import.meta.env.PUBLIC_USE_API === 'true';
const apiUrl = import.meta.env.PUBLIC_API_URL || '';

export const loadHomePageContent = async (lang: Lang): Promise<any> => {
  const fallback = mocks[lang];
  if (!useApi || !apiUrl) return fallback;

  const requestUrl = withLocaleParam(apiUrl, lang);

  try {
    const response = await fetch(requestUrl);
    if (response.ok) {
      const payload = await response.json();
      if (payload && typeof payload === 'object') return payload;
    }
  } catch (error) {
    console.warn(`No se pudo cargar la API desde ${requestUrl}. Usando mock local.`, error);
  }

  return fallback;
};
