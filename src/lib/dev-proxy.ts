const LOCAL_BACKEND_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'wagtail',
  'host.docker.internal'
]);

const trimTrailingSlash = (value: string) => {
  if (!value || value === '/') return value;
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export const toDevApiUrl = (configuredUrl: string | undefined, mode: 'browser' | 'server' = 'browser') => {
  if (!configuredUrl || !import.meta.env.DEV) return configuredUrl || '';

  if (configuredUrl.startsWith('/')) {
    const normalized = trimTrailingSlash(configuredUrl);
    if (mode === 'browser') return normalized;
    return new URL(normalized, 'http://localhost:4321').toString();
  }

  try {
    const parsed = new URL(configuredUrl);
    const host = parsed.hostname.toLowerCase();

    if (!LOCAL_BACKEND_HOSTS.has(host)) return configuredUrl;

    const proxyPath = `/wagtail-api${trimTrailingSlash(parsed.pathname)}${parsed.search}`;
    return mode === 'browser' ? proxyPath : new URL(proxyPath, 'http://localhost:4321').toString();
  } catch {
    return configuredUrl;
  }
};
