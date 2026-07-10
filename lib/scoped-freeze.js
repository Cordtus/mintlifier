import { randomUUID } from 'node:crypto';
import path from 'path';

import fs from 'fs-extra';

import {
  findVersionScopes,
  isSupportedVersionLabel,
  resolveVersionScope
} from './navigation-utils.js';
import { resolveWithinWithoutSymlinks } from './safe-path.js';

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
  const requested = versions.find((entry) => entry.version === workingVersion);
  if (requested) return requested;
  const recognized = versions.filter((entry) =>
    ['next', 'main', 'latest', 'current'].includes(entry.version)
  );
  if (recognized.length === 1) return recognized[0];
  if (recognized.length > 1) {
    throw new Error(`Ambiguous working versions: ${recognized.map((entry) => entry.version).join(', ')}`);
  }
  return versions.find((entry) => entry.default) || versions[0];
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
  const requestedWorkingVersion = scopeData.workingVersion || versionsData.workingVersion || 'next';
  const workingVersionNav = findWorkingVersion(resolvedScope.owner.versions, requestedWorkingVersion);

  if (!workingVersionNav) {
    throw new Error(`No working version found for scope ${resolvedScope.id}`);
  }
  const workingVersion = workingVersionNav.version;

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
  return content.replace(/\]\(([^\s)]+)(\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/g, (match, link, title = '') => {
    if (isExternalOrAssetPath(link)) return match;
    const { pathPart } = splitPathSuffix(stripLeadingSlash(link));
    const hasWorkingVersion = pathPart.split('/').includes(plan.workingVersion);
    if (!hasWorkingVersion) return match;

    const nextLink = replaceVersionSegment(link, [plan.workingVersion], plan.currentVersion);
    return nextLink === link ? match : `](${nextLink}${title})`;
  });
}

function relativeWithin(root, target, label) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid ${label}: path escapes the project directory`);
  }
  return relative.split(path.sep).join('/');
}

async function writeJsonAtomically(filePath, value) {
  const temporary = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.outputJson(temporary, value, { spaces: 2 });
  await fs.rename(temporary, filePath);
}

export async function recoverInterruptedFreeze({ transactionPath }) {
  if (!await fs.pathExists(transactionPath)) return { recovered: false };

  const root = path.dirname(transactionPath);
  const transaction = await fs.readJson(transactionPath);
  const docsJsonPath = await resolveWithinWithoutSymlinks(root, transaction.docsJsonPath, 'transaction docs config');
  const versionsJsonPath = await resolveWithinWithoutSymlinks(root, transaction.versionsJsonPath, 'transaction versions config');
  const cleanupPaths = await Promise.all([
    transaction.stagingDir,
    transaction.docsTemporary,
    transaction.versionsTemporary
  ].filter(Boolean).map((entry) =>
    resolveWithinWithoutSymlinks(root, entry, 'transaction cleanup path')
  ));

  if (transaction.state !== 'committed') {
    for (const target of transaction.targets || []) {
      await fs.remove(await resolveWithinWithoutSymlinks(root, target, 'transaction target'));
    }
    await writeJsonAtomically(docsJsonPath, transaction.originalDocsConfig);
    if (transaction.versionsExisted) {
      await writeJsonAtomically(versionsJsonPath, transaction.originalVersionsData);
    } else {
      await fs.remove(versionsJsonPath);
    }
  }

  for (const cleanupPath of cleanupPaths) await fs.remove(cleanupPath);
  await fs.remove(transactionPath);
  return { recovered: transaction.state !== 'committed' };
}

export async function preflightFileCopies(baseDir, fileCopies) {
  if (fileCopies.length === 0) {
    throw new Error('No documentation pages found to freeze');
  }

  const targets = new Set();
  for (const copy of fileCopies) {
    const sourcePath = await resolveWithinWithoutSymlinks(baseDir, copy.source, 'freeze source');
    const targetPath = await resolveWithinWithoutSymlinks(baseDir, copy.target, 'freeze target');
    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`Source page not found for scoped freeze: ${copy.source}`);
    }
    const sourceStats = await fs.lstat(sourcePath);
    if (!sourceStats.isFile()) {
      throw new Error(`Source page is not a file: ${copy.source}`);
    }
    if (targets.has(targetPath)) {
      throw new Error(`Duplicate freeze target: ${copy.target}`);
    }
    if (await fs.pathExists(targetPath)) {
      throw new Error(`Frozen target already exists: ${copy.target}`);
    }
    targets.add(targetPath);
  }
}

export async function applyScopedFreezePlan({
  docsDir,
  docsJsonPath,
  versionsJsonPath,
  plan,
  now = new Date(),
  transactionPath = path.join(path.dirname(docsJsonPath), '.mintlifier-freeze-transaction.json')
}) {
  if (plan.fileCopies.length === 0) {
    throw new Error(`No documentation pages found for scope ${plan.scope.id}`);
  }

  await recoverInterruptedFreeze({ transactionPath });
  await preflightFileCopies(docsDir, plan.fileCopies);
  const metadataBase = versionBaseDirFromTarget(plan.fileCopies[0].target, plan.currentVersion);
  const metadataRelativePath = path.join(metadataBase, '.version-metadata.json');
  const metadata = {
    version: plan.currentVersion,
    scope: plan.scope.id,
    scopeLabel: plan.scope.label,
    frozenDate: now.toISOString().split('T')[0],
    frozenTimestamp: now.toISOString(),
    nextVersion: plan.nextVersion,
    nodeVersion: process.version
  };
  const metadataPath = await resolveWithinWithoutSymlinks(docsDir, metadataRelativePath, 'freeze metadata');
  if (await fs.pathExists(metadataPath)) {
    throw new Error(`Frozen target already exists: ${metadataRelativePath}`);
  }

  const transactionRoot = path.dirname(transactionPath);
  const stagingDir = path.join(docsDir, `.mintlifier-stage-${randomUUID()}`);
  const originalDocsConfig = await fs.readJson(docsJsonPath);
  const originalVersionsData = await fs.readJson(versionsJsonPath);
  const docsTemporary = `${docsJsonPath}.mintlifier-${process.pid}-${Date.now()}`;
  const versionsTemporary = `${versionsJsonPath}.mintlifier-${process.pid}-${Date.now()}`;
  const targets = [
    ...await Promise.all(plan.fileCopies.map((copy) =>
      resolveWithinWithoutSymlinks(docsDir, copy.target, 'freeze target')
    )),
    metadataPath
  ];
  const transaction = {
    state: 'prepared',
    docsJsonPath: relativeWithin(transactionRoot, docsJsonPath, 'transaction docs config'),
    versionsJsonPath: relativeWithin(transactionRoot, versionsJsonPath, 'transaction versions config'),
    versionsExisted: true,
    originalDocsConfig,
    originalVersionsData,
    targets: targets.map((target) => relativeWithin(transactionRoot, target, 'transaction target')),
    stagingDir: relativeWithin(transactionRoot, stagingDir, 'transaction staging directory'),
    docsTemporary: relativeWithin(transactionRoot, docsTemporary, 'transaction docs temporary'),
    versionsTemporary: relativeWithin(transactionRoot, versionsTemporary, 'transaction versions temporary')
  };

  try {
    await writeJsonAtomically(transactionPath, transaction);
    await fs.ensureDir(stagingDir);
    for (const copy of plan.fileCopies) {
      const sourcePath = await resolveWithinWithoutSymlinks(docsDir, copy.source, 'freeze source');
      const stagedPath = await resolveWithinWithoutSymlinks(stagingDir, copy.target, 'freeze target');
      await fs.ensureDir(path.dirname(stagedPath));
      const content = await fs.readFile(sourcePath, 'utf8');
      await fs.writeFile(stagedPath, rewriteLinks(content, plan));
    }
    await fs.outputJson(
      await resolveWithinWithoutSymlinks(stagingDir, metadataRelativePath, 'freeze metadata'),
      metadata,
      { spaces: 2 }
    );
    await fs.writeJson(docsTemporary, plan.updatedDocsConfig, { spaces: 2 });
    await fs.writeJson(versionsTemporary, plan.updatedVersionsData, { spaces: 2 });

    for (const relativePath of [
      ...plan.fileCopies.map((copy) => copy.target),
      metadataRelativePath
    ]) {
      const stagedPath = await resolveWithinWithoutSymlinks(stagingDir, relativePath, 'freeze target');
      const targetPath = await resolveWithinWithoutSymlinks(docsDir, relativePath, 'freeze target');
      await fs.ensureDir(path.dirname(targetPath));
      await fs.rename(stagedPath, targetPath);
    }

    await fs.rename(docsTemporary, docsJsonPath);
    await fs.rename(versionsTemporary, versionsJsonPath);
    await writeJsonAtomically(transactionPath, { ...transaction, state: 'committed' });
  } catch (error) {
    if (await fs.pathExists(transactionPath)) {
      await recoverInterruptedFreeze({ transactionPath });
    } else {
      await fs.remove(stagingDir);
      await fs.remove(docsTemporary);
      await fs.remove(versionsTemporary);
    }
    throw error;
  }

  await recoverInterruptedFreeze({ transactionPath });

  return {
    copiedFiles: plan.fileCopies.length,
    metadataPath: metadataRelativePath
  };
}
