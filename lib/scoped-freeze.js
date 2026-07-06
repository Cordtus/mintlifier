import path from 'path';

import fs from 'fs-extra';

import {
  findVersionScopes,
  isSupportedVersionLabel,
  resolveVersionScope
} from './navigation-utils.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseVersion(value) {
  const match = String(value).match(/v?(\d+)\.(\d+)\.(\d+)(.*)/);
  if (!match) return [0, 0, 0, ''];
  return [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10), Number.parseInt(match[3], 10), match[4]];
}

function versionCompare(a, b) {
  const [aMajor, aMinor, aPatch, aPre] = parseVersion(a);
  const [bMajor, bMinor, bPatch, bPre] = parseVersion(b);

  if (bMajor !== aMajor) return bMajor - aMajor;
  if (bMinor !== aMinor) return bMinor - aMinor;
  if (bPatch !== aPatch) return bPatch - aPatch;
  if (!aPre && bPre) return -1;
  if (aPre && !bPre) return 1;
  return bPre.localeCompare(aPre);
}

function normalizeVersionLabel(label) {
  if (!isSupportedVersionLabel(label)) {
    throw new Error(`Invalid version label: ${label}`);
  }
  return /^\d+\.\d+/.test(label) ? `v${label}` : label;
}

function isExternalOrAssetPath(value) {
  return value.startsWith('http') ||
    value.startsWith('mailto:') ||
    value.startsWith('#') ||
    value.includes('/snippets/') ||
    value.includes('/assets/') ||
    value.includes('/images/') ||
    value.includes('/static/');
}

function splitPathSuffix(value) {
  const match = String(value).match(/^([^?#]*)(.*)$/);
  return {
    pathPart: match?.[1] || '',
    suffix: match?.[2] || ''
  };
}

function stripLeadingSlash(value) {
  return value.replace(/^\/+/, '');
}

function toMdxPath(value) {
  const clean = stripLeadingSlash(splitPathSuffix(value).pathPart);
  return clean.endsWith('.mdx') ? clean : `${clean}.mdx`;
}

function uniqueValues(values) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function replaceVersionSegment(value, knownVersions, targetVersion) {
  const hadLeadingSlash = value.startsWith('/');
  const { pathPart, suffix } = splitPathSuffix(stripLeadingSlash(value));
  const segments = pathPart.split('/').filter(Boolean);
  const versionIndex = segments.findIndex((segment) => knownVersions.includes(segment));

  if (versionIndex >= 0) {
    segments[versionIndex] = targetVersion;
  } else {
    segments.unshift(targetVersion);
  }

  const transformed = `${segments.join('/')}${suffix}`;
  return hadLeadingSlash ? `/${transformed}` : transformed;
}

function collectDocumentPaths(value, key = null, paths = []) {
  if (!value) return paths;

  if (typeof value === 'string') {
    if ((key === 'pages' || key === 'root') && !isExternalOrAssetPath(value)) {
      paths.push(stripLeadingSlash(splitPathSuffix(value).pathPart));
    }
    return paths;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectDocumentPaths(item, key, paths));
    return paths;
  }

  if (typeof value !== 'object') return paths;

  for (const [childKey, childValue] of Object.entries(value)) {
    if (childKey === 'openapi' || childKey === 'href') continue;
    collectDocumentPaths(childValue, childKey, paths);
  }

  return paths;
}

function transformNavigationPaths(value, transform, key = null) {
  if (typeof value === 'string') {
    if ((key === 'pages' || key === 'root') && !isExternalOrAssetPath(value)) {
      return transform(value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => transformNavigationPaths(item, transform, key));
  }

  if (!value || typeof value !== 'object') return value;

  const result = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (childKey === 'openapi' || childKey === 'href') {
      result[childKey] = childValue;
    } else {
      result[childKey] = transformNavigationPaths(childValue, transform, childKey);
    }
  }

  return result;
}

function ownerFromScopePath(navigation, scopePath) {
  const ownerPath = scopePath.slice(0, -1);
  let owner = navigation;
  for (const segment of ownerPath) {
    owner = owner?.[segment];
  }
  return owner;
}

function findWorkingVersion(versions, workingVersion) {
  return versions.find((entry) => entry.version === workingVersion) ||
    versions.find((entry) => entry.default) ||
    versions.find((entry) => ['next', 'main', 'latest', 'current'].includes(entry.version)) ||
    versions[0];
}

function scopedVersionData(versionsData, scopeId) {
  return versionsData?.scopes?.[scopeId] || {
    versions: versionsData?.versions || [],
    currentVersion: versionsData?.currentVersion || null,
    workingVersion: versionsData?.workingVersion || 'next',
    defaultVersion: versionsData?.defaultVersion || null
  };
}

function planSummaryScope(scope) {
  return {
    id: scope.id,
    label: scope.label,
    path: scope.path,
    versions: scope.versions,
    aliases: scope.aliases
  };
}

export function buildScopedFreezePlan({
  docsConfig,
  versionsData = {},
  scope,
  currentVersion,
  nextVersion
}) {
  const scopes = findVersionScopes(docsConfig.navigation);
  const resolvedScope = resolveVersionScope(scopes, scope);
  const currentVersionFinal = normalizeVersionLabel(currentVersion);
  const nextVersionFinal = normalizeVersionLabel(nextVersion);
  const scopeData = scopedVersionData(versionsData, resolvedScope.id);
  const workingVersion = scopeData.workingVersion || versionsData.workingVersion || 'next';
  const workingVersionNav = findWorkingVersion(resolvedScope.owner.versions, workingVersion);

  if (!workingVersionNav) {
    throw new Error(`No working version found for scope ${resolvedScope.id}`);
  }

  const knownVersions = uniqueValues([
    workingVersion,
    ...resolvedScope.versions,
    ...(scopeData.versions || []),
    'next',
    'main',
    'latest',
    'current'
  ]);
  const documentPaths = uniqueValues(collectDocumentPaths(workingVersionNav));
  const fileCopies = documentPaths.map((sourcePath) => ({
    source: toMdxPath(sourcePath),
    target: toMdxPath(replaceVersionSegment(sourcePath, knownVersions, currentVersionFinal))
  }));

  const frozenNav = transformNavigationPaths(
    clone(workingVersionNav),
    (value) => replaceVersionSegment(value, knownVersions, currentVersionFinal)
  );
  frozenNav.version = currentVersionFinal;
  delete frozenNav.default;

  const updatedDocsConfig = clone(docsConfig);
  const updatedOwner = ownerFromScopePath(updatedDocsConfig.navigation, resolvedScope.path);
  const existingIndex = updatedOwner.versions.findIndex((entry) => entry.version === currentVersionFinal);
  const workingIndex = updatedOwner.versions.findIndex((entry) => entry.version === workingVersionNav.version);

  if (existingIndex >= 0) {
    updatedOwner.versions[existingIndex] = frozenNav;
  } else {
    updatedOwner.versions.splice(workingIndex + 1, 0, frozenNav);
  }

  const updatedVersionsData = clone(versionsData || {});
  updatedVersionsData.versionSchema = Math.max(2, Number(updatedVersionsData.versionSchema || 0));
  updatedVersionsData.scopes = updatedVersionsData.scopes || {};
  const updatedScopeData = {
    ...scopeData,
    versions: uniqueValues([currentVersionFinal, ...(scopeData.versions || [])]).sort(versionCompare),
    currentVersion: nextVersionFinal,
    workingVersion,
    defaultVersion: currentVersionFinal
  };
  updatedVersionsData.scopes[resolvedScope.id] = updatedScopeData;

  if (resolvedScope.id === 'root') {
    updatedVersionsData.versions = updatedScopeData.versions;
    updatedVersionsData.currentVersion = updatedScopeData.currentVersion;
    updatedVersionsData.workingVersion = updatedScopeData.workingVersion;
    updatedVersionsData.defaultVersion = updatedScopeData.defaultVersion;
  }

  return {
    scope: planSummaryScope(resolvedScope),
    currentVersion: currentVersionFinal,
    nextVersion: nextVersionFinal,
    workingVersion,
    knownVersions,
    fileCopies,
    updatedDocsConfig,
    updatedVersionsData
  };
}

function versionBaseDirFromTarget(target, currentVersion) {
  const segments = target.split('/');
  const versionIndex = segments.indexOf(currentVersion);
  if (versionIndex < 0) return currentVersion;
  return segments.slice(0, versionIndex + 1).join('/');
}

function rewriteLinks(content, plan) {
  return content.replace(/\]\(([^)]+)\)/g, (match, link) => {
    if (isExternalOrAssetPath(link)) return match;

    const nextLink = replaceVersionSegment(link, plan.knownVersions, plan.currentVersion);
    if (nextLink === link) return match;

    return `](${nextLink})`;
  });
}

export async function applyScopedFreezePlan({
  docsDir,
  docsJsonPath,
  versionsJsonPath,
  plan,
  now = new Date()
}) {
  if (plan.fileCopies.length === 0) {
    throw new Error(`No documentation pages found for scope ${plan.scope.id}`);
  }

  for (const copy of plan.fileCopies) {
    const sourcePath = path.join(docsDir, copy.source);
    const targetPath = path.join(docsDir, copy.target);

    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`Source page not found for scoped freeze: ${copy.source}`);
    }

    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(sourcePath, targetPath, { overwrite: false, errorOnExist: true });

    const content = await fs.readFile(targetPath, 'utf8');
    const rewritten = rewriteLinks(content, plan);
    if (rewritten !== content) {
      await fs.writeFile(targetPath, rewritten);
    }
  }

  await fs.writeJson(docsJsonPath, plan.updatedDocsConfig, { spaces: 2 });
  await fs.writeJson(versionsJsonPath, plan.updatedVersionsData, { spaces: 2 });

  const metadataBase = versionBaseDirFromTarget(plan.fileCopies[0].target, plan.currentVersion);
  await fs.writeJson(path.join(docsDir, metadataBase, '.version-metadata.json'), {
    version: plan.currentVersion,
    scope: plan.scope.id,
    scopeLabel: plan.scope.label,
    frozenDate: now.toISOString().split('T')[0],
    frozenTimestamp: now.toISOString(),
    nextVersion: plan.nextVersion,
    nodeVersion: process.version
  }, { spaces: 2 });

  return {
    copiedFiles: plan.fileCopies.length,
    metadataPath: path.join(metadataBase, '.version-metadata.json')
  };
}
