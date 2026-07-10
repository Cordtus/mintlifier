import path from 'node:path';

import { confirm, input, select } from '@inquirer/prompts';
import fs from 'fs-extra';

import {
  planGeneratedPages,
  transformNavigationPages
} from './page-planner.js';
import { isSupportedVersionLabel } from './navigation-utils.js';
import { resolveProjectLayout } from './project-layout.js';

function splitReference(value) {
  const match = String(value).match(/^([^?#]*)(.*)$/);
  return { path: match?.[1] || '', suffix: match?.[2] || '' };
}

function addWorkingVersion(reference, workingVersion) {
  const leadingSlash = reference.startsWith('/');
  const { path: referencePath, suffix } = splitReference(reference.replace(/^\/+/, ''));
  const cleanPath = referencePath.replace(/\.mdx$/, '');
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments[0] === 'docs') segments.splice(1, 0, workingVersion);
  else segments.unshift(workingVersion);
  return `${leadingSlash ? '/' : ''}${segments.join('/')}${suffix}`;
}

function versionNavigation(navigation, workingVersion) {
  const updatedNavigation = transformNavigationPages(
    navigation,
    (page) => addWorkingVersion(page, workingVersion)
  );
  const fileMoves = planGeneratedPages(navigation).map(({ reference, relativePath }) => ({
    source: relativePath,
    target: `${addWorkingVersion(reference, workingVersion).replace(/^\/+/, '')}.mdx`
  }));
  return { navigation: updatedNavigation, fileMoves };
}

function findWorkingVersion(versions, requested) {
  return versions.find((entry) => entry.version === requested) ||
    versions.find((entry) => entry.default) ||
    versions.find((entry) => ['next', 'main', 'latest', 'current'].includes(entry.version)) ||
    versions[0];
}

export function buildVersionSetupPlan({
  layout,
  docsConfig,
  workingVersion = 'next',
  currentVersion
}) {
  const updatedDocsConfig = structuredClone(docsConfig);
  const existingVersions = updatedDocsConfig.navigation?.versions;

  if (Array.isArray(existingVersions)) {
    const working = findWorkingVersion(existingVersions, workingVersion);
    if (!working) throw new Error(`No working version found for ${workingVersion}`);
    const frozen = existingVersions
      .map((entry) => entry.version)
      .filter((version) => version !== working.version);
    return {
      layout,
      updatedDocsConfig,
      updatedVersionsData: {
        versions: frozen,
        currentVersion: currentVersion || working.version,
        workingVersion: working.version,
        defaultVersion: frozen[0] || working.version
      },
      fileMoves: []
    };
  }

  if (!updatedDocsConfig.navigation) {
    throw new Error('docs.json has no navigation to version');
  }
  const transformed = versionNavigation(updatedDocsConfig.navigation, workingVersion);
  updatedDocsConfig.navigation = {
    versions: [{
      version: workingVersion,
      default: true,
      ...transformed.navigation
    }]
  };

  return {
    layout,
    updatedDocsConfig,
    updatedVersionsData: {
      versions: [],
      currentVersion: currentVersion || workingVersion,
      workingVersion,
      defaultVersion: workingVersion
    },
    fileMoves: transformed.fileMoves
  };
}

async function writeJsonAtomically(filePath, value) {
  const temporary = `${filePath}.mintlifier-${process.pid}-${Date.now()}`;
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(temporary, value, { spaces: 2 });
  await fs.rename(temporary, filePath);
}

export async function applyVersionSetupPlan(plan) {
  const resolvedMoves = plan.fileMoves.map((move) => ({
    source: path.join(plan.layout.configDir, move.source),
    target: path.join(plan.layout.configDir, move.target),
    relativeSource: move.source,
    relativeTarget: move.target
  }));

  const targets = new Set();
  for (const move of resolvedMoves) {
    if (!await fs.pathExists(move.source)) {
      throw new Error(`Source page not found: ${move.relativeSource}`);
    }
    if (targets.has(move.target) || await fs.pathExists(move.target)) {
      throw new Error(`Version target already exists: ${move.relativeTarget}`);
    }
    targets.add(move.target);
  }

  const originalConfig = await fs.readJson(plan.layout.configPath);
  const versionsExisted = await fs.pathExists(plan.layout.versionsPath);
  const originalVersions = versionsExisted
    ? await fs.readJson(plan.layout.versionsPath)
    : null;
  const completed = [];

  try {
    for (const move of resolvedMoves) {
      await fs.ensureDir(path.dirname(move.target));
      await fs.move(move.source, move.target);
      completed.push(move);
    }
    await writeJsonAtomically(plan.layout.configPath, plan.updatedDocsConfig);
    await writeJsonAtomically(plan.layout.versionsPath, plan.updatedVersionsData);
  } catch (error) {
    for (const move of completed.reverse()) {
      if (await fs.pathExists(move.target)) {
        await fs.ensureDir(path.dirname(move.source));
        await fs.move(move.target, move.source, { overwrite: true });
      }
    }
    await writeJsonAtomically(plan.layout.configPath, originalConfig);
    if (versionsExisted) {
      await writeJsonAtomically(plan.layout.versionsPath, originalVersions);
    } else {
      await fs.remove(plan.layout.versionsPath);
    }
    throw error;
  }
}

function validateVersionLabel(value) {
  return isSupportedVersionLabel(value)
    ? true
    : 'Use a path-safe label such as next, main, v1.0.0, v0.53, or v8.5.x';
}

export async function setupVersioning({
  cwd = process.cwd(),
  configPath,
  workingVersion,
  currentVersion,
  nonInteractive = false
} = {}) {
  const layout = await resolveProjectLayout({ cwd, configPath });
  const docsConfig = await fs.readJson(layout.configPath);
  const alreadyVersioned = Array.isArray(docsConfig.navigation?.versions);

  let selectedWorkingVersion = workingVersion;
  let selectedCurrentVersion = currentVersion;

  if (!alreadyVersioned && !selectedWorkingVersion && !nonInteractive) {
    selectedWorkingVersion = await select({
      message: 'Working documentation label:',
      choices: ['next', 'current', 'latest', 'main'].map((value) => ({
        name: value,
        value
      })),
      default: 'next'
    });
  }
  selectedWorkingVersion ||= 'next';

  if (!alreadyVersioned && !selectedCurrentVersion && !nonInteractive) {
    selectedCurrentVersion = await input({
      message: 'Current development version:',
      default: 'v1.0.0',
      validate: validateVersionLabel
    });
  }
  selectedCurrentVersion ||= selectedWorkingVersion;

  if (!nonInteractive) {
    const proceed = await confirm({
      message: alreadyVersioned
        ? 'Create or refresh versions.json for this navigation?'
        : `Move current pages into ${selectedWorkingVersion} and enable version navigation?`,
      default: true
    });
    if (!proceed) throw new Error('Versioning setup cancelled');
  }

  const plan = buildVersionSetupPlan({
    layout,
    docsConfig,
    workingVersion: selectedWorkingVersion,
    currentVersion: selectedCurrentVersion
  });
  await applyVersionSetupPlan(plan);
  return plan;
}
