// Turns the CMS redirect list (wagtail.contrib.redirects, Docs/API_CONTRACT.md
// "Redirects") into nginx `map` files at build time. The site is static, so
// there's no runtime to redirect from: nginx.conf includes these maps and
// answers 301/302 itself.
//
// Output (repo-root nginx/, NOT dist/ — dist is public):
//   nginx/redirects-301.map   permanent
//   nginx/redirects-302.map   temporary
// Both files are always written, even when empty, so the Dockerfile's
// `COPY nginx/ ...` never fails. Entries look like:  "/old-path" "/new-path";
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import mockRedirects from '../mocks/redirects.json' with { type: 'json' };

// Anything that could break out of an nginx quoted string or the map syntax.
const UNSAFE = /[\s"'`;{}$\\]/;

const cleanOldPath = (value) => {
  if (typeof value !== 'string') return null;
  const path = value.split('#')[0].split('?')[0].trim();
  if (!path.startsWith('/') || UNSAFE.test(path)) return null;
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
};

const cleanNewPath = (value) => {
  if (typeof value !== 'string') return null;
  const target = value.trim();
  if (UNSAFE.test(target)) return null;
  if (/^https:\/\//i.test(target)) return target;
  if (!target.startsWith('/') || target.startsWith('//')) return null;
  return target.length > 1 ? target.replace(/\/+$/, '') || '/' : target;
};

/** Pure: validates raw CMS items and returns the redirects to emit + warnings. */
export function buildRedirects(items) {
  const warnings = [];
  const accepted = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const from = cleanOldPath(item?.old_path);
    const to = cleanNewPath(item?.new_path);

    if (!from || !to) {
      warnings.push(`Redirección descartada (ruta inválida): ${JSON.stringify(item)}`);
      continue;
    }
    if (from === to) {
      warnings.push(`Redirección descartada (a sí misma): ${from}`);
      continue;
    }
    accepted.set(from, { from, to, permanent: item?.is_permanent !== false });
  }

  // Simple loops: A -> B and B -> A. Both sides go, so neither half is left
  // redirecting to a page that then bounces back.
  const looped = [...accepted.values()].filter((entry) => accepted.get(entry.to)?.to === entry.from);
  for (const entry of looped) {
    warnings.push(`Redirección descartada (ciclo ${entry.from} <-> ${entry.to}): ${entry.from}`);
    accepted.delete(entry.from);
  }

  return { redirects: [...accepted.values()], warnings };
}

const toMap = (entries) => entries.map(({ from, to }) => `"${from}" "${to}";\n`).join('');

const loadItems = async ({ useApi, apiUrl }) => {
  if (useApi && apiUrl) {
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload?.fields?.items)) return payload.fields.items;
      }
    } catch (error) {
      console.warn(`No se pudo cargar Redirects desde ${apiUrl}. Usando mock local.`, error);
    }
  }
  return mockRedirects.fields?.items ?? [];
};

export default function nginxRedirects(options = {}) {
  return {
    name: 'policrafters-nginx-redirects',
    hooks: {
      'astro:build:done': async ({ logger }) => {
        const items = await loadItems(options);
        const { redirects, warnings } = buildRedirects(items);
        warnings.forEach((warning) => logger.warn(warning));

        const outDir = new URL('../../nginx/', import.meta.url);
        await fs.mkdir(fileURLToPath(outDir), { recursive: true });
        await fs.writeFile(new URL('redirects-301.map', outDir), toMap(redirects.filter((r) => r.permanent)));
        await fs.writeFile(new URL('redirects-302.map', outDir), toMap(redirects.filter((r) => !r.permanent)));

        logger.info(`nginx: ${redirects.length} redirecciones escritas en nginx/*.map`);
      }
    }
  };
}
