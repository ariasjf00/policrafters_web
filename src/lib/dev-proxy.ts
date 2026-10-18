const LOCAL_BACKEND_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'wagtail',
  'host.docker.internal'
]);

export const toDevApiUrl = (configuredUrl: string | undefined, mode: 'browser' | 'server' = 'browser') => {
  if (!configuredUrl || !import.meta.env.DEV) return configuredUrl || '';

  try {
    const parsed = new URL(configuredUrl);
    const host = parsed.hostname.toLowerCase();

    if (!LOCAL_BACKEND_HOSTS.has(host)) return configuredUrl;

    const proxyPath = `/wagtail-api${parsed.pathname}${parsed.search}`;
    return mode === 'browser' ? proxyPath : new URL(proxyPath, 'http://localhost:4321').toString();
  } catch {
    return configuredUrl;
  }
};
