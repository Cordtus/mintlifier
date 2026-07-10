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

function slugifyScopeLabel(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function scopeKind(owner, path) {
  if (owner?.dropdown) return 'dropdown';
  if (owner?.tab) return 'tab';
  if (owner?.anchor) return 'anchor';
  if (owner?.group) return 'group';
  if (owner?.language) return 'language';

  const parentKey = path.at(-2);
  if (typeof parentKey === 'string' && parentKey.endsWith('s')) {
    return parentKey.slice(0, -1);
  }

  return 'scope';
}

function scopeLabel(owner, path) {
  return owner?.dropdown ||
    owner?.tab ||
    owner?.anchor ||
    owner?.group ||
    owner?.language ||
    owner?.label ||
    owner?.name ||
    path.join('.');
}

export function findVersionScopes(navigation) {
  const usedIds = new Map();

  return findVersionNodes(navigation).map((node) => {
    if (node.path.length === 1 && node.path[0] === 'versions') {
      return {
        ...node,
        id: 'root',
        label: 'Global navigation',
        aliases: ['root', 'global', 'navigation']
      };
    }

    const kind = scopeKind(node.owner, node.path);
    const label = scopeLabel(node.owner, node.path);
    const baseId = `${kind}:${slugifyScopeLabel(label) || node.path.join('-')}`;
    const count = usedIds.get(baseId) || 0;
    usedIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
    const labelSlug = slugifyScopeLabel(label);

    return {
      ...node,
      id,
      label,
      aliases: [id, labelSlug, label].filter(Boolean)
    };
  });
}

export function resolveVersionScope(scopes, requestedScope) {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw new Error('No versioned navigation scopes were found');
  }

  if (!requestedScope) {
    if (scopes.length === 1) return scopes[0];
    throw new Error('Multiple versioned navigation scopes found. Pass --scope to choose one.');
  }

  const requestedSlug = slugifyScopeLabel(requestedScope);
  const scope = scopes.find((candidate) => {
    return candidate.aliases.some((alias) => {
      return alias === requestedScope || slugifyScopeLabel(alias) === requestedSlug;
    });
  });

  if (!scope) {
    const available = scopes.map((candidate) => candidate.id).join(', ');
    throw new Error(`Unknown versioning scope: ${requestedScope}. Available scopes: ${available}`);
  }

  return scope;
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
  if (trimmed === '.') return false;

  return /^[A-Za-z0-9._-]+$/.test(trimmed);
}
