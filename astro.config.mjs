// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

import sitemap from '@astrojs/sitemap';

// astro.config.mjs runs in Node before Astro's own `import.meta.env` exists, so SEO-related
// env vars (SITE_URL, PUBLIC_ALLOW_INDEXING) are read here with Vite's loadEnv instead.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const siteUrl = env.SITE_URL || process.env.SITE_URL || 'https://policrafters.com';

// Routes that should never appear in the sitemap: the CMS preview stub, the
// still-placeholder /projects page (see src/pages/preview.astro,
// src/pages/projects.astro) and their Spanish twins. The custom 404 pages are
// excluded too — they have no canonical URL of their own. The legacy
// /collections/product?slug= redirect stub (see src/pages/collections/product.astro)
// is excluded in both languages as well.
const SITEMAP_EXCLUDED_PATHS = [
  '/preview',
  '/projects', '/es/projects',
  '/404', '/es/404',
  '/collections/product', '/es/collections/product'
];

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  trailingSlash: 'never',
  build: {
    format: 'file'
  },
  integrations: [
    icon(),
    sitemap({
      // Emits xhtml:link alternates (hreflang) per URL — see
      // src/components/SeoHead.astro for the same pair in each page's <head>.
      // English has no path segment (it's the default locale), Spanish is /es.
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es' }
      },
      filter: (page) => {
        const { pathname } = new URL(page);
        const normalized = pathname.replace(/\/+$/, '') || '/';
        return !SITEMAP_EXCLUDED_PATHS.includes(normalized);
      }
    })
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/wagtail-api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/wagtail-api/, '')
        }
      }
    }
  }
});
