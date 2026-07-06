export function findVersionNodes(navigation) {
  const nodes = [];

  function visit(value, path) {
    if (!value || typeof value !== 'object') return;

    if (!Array.isArray(value) && Array.isArray(value.versions) && value.versions.length > 0) {
      nodes.push({
        path: [...path, 'versions'],
        owner: value,
        versions: value.versions
          .map((version) => version?.version)
          .filter((version) => typeof version === 'string' && version.length > 0)
      });
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, index]));
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      visit(child, [...path, key]);
    }
  }

  visit(navigation, []);
  return nodes;
}

export function hasVersioning(navigation) {
  return findVersionNodes(navigation).length > 0;
}

export function isTopLevelVersionedNavigation(navigation) {
  return Boolean(
    navigation &&
    typeof navigation === 'object' &&
    !Array.isArray(navigation) &&
    Array.isArray(navigation.versions) &&
    navigation.versions.length > 0
  );
}

export function isSupportedVersionLabel(label) {
  if (typeof label !== 'string') return false;

  const trimmed = label.trim();
  if (!trimmed) return false;
  if (trimmed !== label) return false;
  if (/[\\/\s]/.test(trimmed)) return false;
  if (trimmed.includes('..')) return false;

  return /^[A-Za-z0-9._-]+$/.test(trimmed);
}
