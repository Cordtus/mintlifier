import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import fs from 'fs-extra';

import {
  applyVersionSetupPlan,
  buildVersionSetupPlan,
  setupVersioning
} from '../lib/version-manager.js';
import { resolveProjectLayout } from '../lib/project-layout.js';

test('already-versioned navigation can initialize missing metadata', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-version-'));
  const config = {
    navigation: {
      versions: [
        { version: 'next', default: true, pages: ['docs/next/intro'] },
        { version: 'v1.0.0', pages: ['docs/v1.0.0/intro'] }
      ]
    }
  };
  await fs.writeJson(path.join(root, 'docs.json'), config);
  await fs.outputFile(path.join(root, 'docs/next/intro.mdx'), '# Intro\n');

  const layout = await resolveProjectLayout({ cwd: root });
  const plan = buildVersionSetupPlan({
    layout,
    docsConfig: config,
    workingVersion: 'next',
    currentVersion: 'v1.1.0'
  });
  await applyVersionSetupPlan(plan);

  const metadata = await fs.readJson(path.join(root, 'docs/versions.json'));
  assert.deepEqual(metadata.versions, ['v1.0.0']);
  assert.equal(metadata.currentVersion, 'v1.1.0');
  assert.equal(metadata.workingVersion, 'next');
  assert.equal(await fs.pathExists(path.join(root, 'docs.json')), true);
  assert.equal(await fs.pathExists(path.join(root, 'docs/docs.json')), false);
});

test('unversioned setup moves pages under the working label and keeps config in place', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-version-'));
  const config = {
    navigation: {
      groups: [{ group: 'Start', pages: ['docs/intro', 'docs/nested/setup'] }]
    }
  };
  await fs.writeJson(path.join(root, 'docs.json'), config);
  await fs.outputFile(path.join(root, 'docs/intro.mdx'), '# Intro\n');
  await fs.outputFile(path.join(root, 'docs/nested/setup.mdx'), '# Setup\n');

  const layout = await resolveProjectLayout({ cwd: root });
  const plan = buildVersionSetupPlan({
    layout,
    docsConfig: config,
    workingVersion: 'next',
    currentVersion: 'v1.0.0'
  });
  await applyVersionSetupPlan(plan);

  const updatedConfig = await fs.readJson(path.join(root, 'docs.json'));
  assert.deepEqual(updatedConfig.navigation.versions[0].groups[0].pages, [
    'docs/next/intro',
    'docs/next/nested/setup'
  ]);
  assert.equal(await fs.pathExists(path.join(root, 'docs/intro.mdx')), false);
  assert.equal(await fs.pathExists(path.join(root, 'docs/next/intro.mdx')), true);
  assert.equal(await fs.pathExists(path.join(root, 'docs/next/nested/setup.mdx')), true);
  assert.equal(await fs.pathExists(path.join(root, 'docs.json.backup')), false);
});

test('nested docs/docs.json setup does not create docs/docs', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-version-'));
  const config = { navigation: { pages: ['intro'] } };
  await fs.outputJson(path.join(root, 'docs/docs.json'), config);
  await fs.outputFile(path.join(root, 'docs/intro.mdx'), '# Intro\n');

  const layout = await resolveProjectLayout({ cwd: root });
  const plan = buildVersionSetupPlan({
    layout,
    docsConfig: config,
    workingVersion: 'next',
    currentVersion: 'v1.0.0'
  });
  await applyVersionSetupPlan(plan);

  assert.equal(await fs.pathExists(path.join(root, 'docs/next/intro.mdx')), true);
  assert.equal(await fs.pathExists(path.join(root, 'docs/docs')), false);
  assert.deepEqual(
    (await fs.readJson(path.join(root, 'docs/docs.json'))).navigation.versions[0].pages,
    ['next/intro']
  );
});

test('setupVersioning repairs missing metadata for an already-versioned project', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-version-'));
  await fs.writeJson(path.join(root, 'docs.json'), {
    navigation: {
      versions: [
        { version: 'next', default: true, pages: ['docs/next/intro'] },
        { version: 'v1.0.0', pages: ['docs/v1.0.0/intro'] }
      ]
    }
  });
  await fs.outputFile(path.join(root, 'docs/next/intro.mdx'), '# Intro\n');

  const result = await setupVersioning({ cwd: root, nonInteractive: true });

  assert.equal(result.layout.configPath, path.join(root, 'docs.json'));
  assert.deepEqual(await fs.readJson(path.join(root, 'docs/versions.json')), {
    versions: ['v1.0.0'],
    currentVersion: 'next',
    workingVersion: 'next',
    defaultVersion: 'v1.0.0'
  });
});
