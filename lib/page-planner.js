import { normalizeProjectRelativePath } from './safe-path.js';

const NON_PAGE_PREFIXES = [
  'http://',
  'https://',
  'mailto:',
  '#',
  'assets/',
  'images/',
  'snippets/',
  'static/'
];

function splitReference(value) {
  const match = String(value).match(/^([^?#]*)(.*)$/);
  return {
    path: match?.[1] || '',
    suffix: match?.[2] || ''
  };
}

function isLocalPage(value) {
  if (typeof value !== 'string') return false;
  const clean = value.replace(/^\/+/, '');
  return !NON_PAGE_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

function mapNavigation(value, key, mapPage) {
  if (typeof value === 'string') {
    return (key === 'pages' || key === 'root') && isLocalPage(value)
      ? mapPage(value)
      : value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => mapNavigation(entry, key, mapPage));
  }

  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
    childKey,
    childKey === 'href' || childKey === 'openapi'
      ? childValue
      : mapNavigation(childValue, childKey, mapPage)
  ]));
}

export function transformNavigationPages(navigation, mapPage) {
  return mapNavigation(structuredClone(navigation), null, mapPage);
}

export function prefixNavigationPages(navigation, prefix) {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
  return transformNavigationPages(navigation, (page) => {
    const leadingSlash = page.startsWith('/');
    const { path, suffix } = splitReference(page.replace(/^\/+/, ''));
    const nextPath = path === cleanPrefix || path.startsWith(`${cleanPrefix}/`)
      ? path
      : `${cleanPrefix}/${path}`;
    return `${leadingSlash ? '/' : ''}${nextPath}${suffix}`;
  });
}

export function planGeneratedPages(navigation) {
  const pages = [];
  mapNavigation(navigation, null, (page) => {
    const { path } = splitReference(page.replace(/^\/+/, ''));
    pages.push(normalizeProjectRelativePath(path.replace(/\.mdx$/, ''), 'navigation page'));
    return page;
  });

  return [...new Set(pages)].sort().map((reference) => ({
    reference,
    relativePath: `${reference}.mdx`
  }));
}
