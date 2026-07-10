const CONTENT_KEYS = ['pages', 'groups', 'tabs', 'dropdowns', 'anchors'];

function collectPages(value, key = null, pages = []) {
  if (typeof value === 'string') {
    if (key === 'pages' || key === 'root') pages.push(value);
    return pages;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectPages(entry, key, pages);
    return pages;
  }
  if (!value || typeof value !== 'object') return pages;
  for (const [childKey, childValue] of Object.entries(value)) {
    if (childKey === 'global' || childKey === 'href' || childKey === 'openapi') continue;
    collectPages(childValue, childKey, pages);
  }
  return pages;
}

export function navigationPageDefaults(navigation = {}) {
  return [...new Set(collectPages(navigation))];
}

export function convertNavigationToVersions(navigation = {}, version) {
  const existing = structuredClone(navigation);
  if (Array.isArray(existing.versions)) return existing;

  const content = Object.fromEntries(
    CONTENT_KEYS
      .filter((key) => existing[key] !== undefined)
      .map((key) => [key, existing[key]])
  );
  if (Object.keys(content).length === 0) {
    throw new Error('Navigation has no pages, groups, tabs, dropdowns, or anchors to convert');
  }

  return {
    ...(existing.global ? { global: existing.global } : {}),
    versions: [{ version, default: true, ...content }]
  };
}
