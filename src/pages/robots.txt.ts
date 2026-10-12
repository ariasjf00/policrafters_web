// Build-time robots.txt. There is no static public/robots.txt — this is the
// single source so it can read SITE_URL / PUBLIC_ALLOW_INDEXING at build time
// (see src/lib/seo.ts, .env.example, Docs/SEO_phase1_prod_changes_pending.md).
import type { APIRoute } from 'astro';
import { isIndexingAllowed } from '../lib/seo';

export const GET: APIRoute = ({ site }) => {
	const sitemapUrl = new URL('sitemap-index.xml', site ?? 'https://policrafters.com').toString();

	const body = isIndexingAllowed()
		? `User-agent: *\nAllow: /\nDisallow: /preview\n\nSitemap: ${sitemapUrl}\n`
		: `User-agent: *\nDisallow: /\n`;

	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
