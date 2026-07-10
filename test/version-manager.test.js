import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import fs from 'fs-extra';

import {
  applyVersionSetupPlan,
  buildVersionSetupPlan,
  freezeVersion,
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

test('setupVersioning preserves product scopes while creating missing metadata', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-version-'));
  const docsConfig = {
    navigation: {
      dropdowns: [{
        dropdown: 'API',
        versions: [
          { version: 'next', default: true, pages: ['api/next/intro'] },
          { version: 'v1.0.0', pages: ['api/v1.0.0/intro'] }
        ]
      }]
    }
  };
  await fs.writeJson(path.join(root, 'docs.json'), docsConfig);
  await fs.outputFile(path.join(root, 'docs/api/next/intro.mdx'), '# Intro\n');

  await setupVersioning({ cwd: root, nonInteractive: true });

  assert.deepEqual(await fs.readJson(path.join(root, 'docs.json')), docsConfig);
  assert.deepEqual(await fs.readJson(path.join(root, 'docs/versions.json')), {
    versionSchema: 2,
    scopes: {
      'dropdown:api': {
        versions: ['v1.0.0'],
        currentVersion: 'next',
        workingVersion: 'next',
        defaultVersion: 'v1.0.0'
      }
    }
  });
});

test('flat freeze copies the working pages and updates navigation and metadata', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-flat-freeze-'));
  const docsConfig = {
    navigation: {
      versions: [{
        version: 'next',
        default: true,
        pages: ['docs/next/intro', 'docs/next/setup']
      }]
    }
  };
  const versionsData = {
    versions: [],
    currentVersion: 'v1.0.0',
    workingVersion: 'next',
    defaultVersion: 'next'
  };
  await fs.writeJson(path.join(root, 'docs.json'), docsConfig);
  await fs.outputFile(
    path.join(root, 'docs/next/intro.mdx'),
    '# Intro\n\n[Setup](/docs/next/setup)\n'
  );
  await fs.outputFile(path.join(root, 'docs/next/setup.mdx'), '# Setup\n');
  await fs.writeJson(path.join(root, 'docs/versions.json'), versionsData);

  const result = await freezeVersion({
    cwd: root,
    version: 'v1.0.0',
    nextVersion: 'next',
    yes: true,
    nonInteractive: true,
    now: new Date('2026-07-09T12:00:00.000Z')
  });

  assert.equal(result.copiedFiles, 2);
  assert.equal(await fs.pathExists(path.join(root, 'docs/v1.0.0/intro.mdx')), true);
  assert.match(
    await fs.readFile(path.join(root, 'docs/v1.0.0/intro.mdx'), 'utf8'),
    /\[Setup\]\(\/docs\/v1\.0\.0\/setup\)/
  );
  assert.deepEqual(
    (await fs.readJson(path.join(root, 'docs.json'))).navigation.versions.map((entry) => entry.version),
    ['next', 'v1.0.0']
  );
  assert.deepEqual(await fs.readJson(path.join(root, 'docs/versions.json')), {
    versionSchema: 2,
    scopes: {
      root: {
        versions: ['v1.0.0'],
        currentVersion: 'next',
        workingVersion: 'next',
        defaultVersion: 'v1.0.0'
      }
    },
    versions: ['v1.0.0'],
    currentVersion: 'next',
    workingVersion: 'next',
    defaultVersion: 'v1.0.0'
  });
});

test('dry-run validates a flat freeze without changing files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-flat-dry-run-'));
  const docsConfig = {
    navigation: {
      versions: [{ version: 'next', default: true, pages: ['docs/next/intro'] }]
    }
  };
  const versionsData = {
    versions: [], currentVersion: 'v1.0.0', workingVersion: 'next', defaultVersion: 'next'
  };
  await fs.writeJson(path.join(root, 'docs.json'), docsConfig);
  await fs.outputFile(path.join(root, 'docs/next/intro.mdx'), '# Intro\n');
  await fs.writeJson(path.join(root, 'docs/versions.json'), versionsData);

  const result = await freezeVersion({
    cwd: root,
    version: 'v1.0.0',
    nextVersion: 'next',
    dryRun: true,
    nonInteractive: true
  });

  assert.equal(result.dryRun, true);
  assert.equal(await fs.pathExists(path.join(root, 'docs/v1.0.0/intro.mdx')), false);
  assert.deepEqual(await fs.readJson(path.join(root, 'docs.json')), docsConfig);
  assert.deepEqual(await fs.readJson(path.join(root, 'docs/versions.json')), versionsData);
});

test('flat freeze rejects an existing snapshot without changing metadata', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-flat-existing-'));
  const docsConfig = {
    navigation: {
      versions: [{ version: 'next', default: true, pages: ['docs/next/intro'] }]
    }
  };
  const versionsData = {
    versions: [], currentVersion: 'v1.0.0', workingVersion: 'next', defaultVersion: 'next'
  };
  await fs.writeJson(path.join(root, 'docs.json'), docsConfig);
  await fs.outputFile(path.join(root, 'docs/next/intro.mdx'), '# Intro\n');
  await fs.writeJson(path.join(root, 'docs/versions.json'), versionsData);
  await fs.outputFile(path.join(root, 'docs/v1.0.0/intro.mdx'), '# Existing\n');

  await assert.rejects(
    freezeVersion({
      cwd: root,
      version: 'v1.0.0',
      nextVersion: 'next',
      yes: true,
      nonInteractive: true
    }),
    /Frozen target already exists/
  );
  assert.equal(
    await fs.readFile(path.join(root, 'docs/v1.0.0/intro.mdx'), 'utf8'),
    '# Existing\n'
  );
  assert.deepEqual(await fs.readJson(path.join(root, 'docs/versions.json')), versionsData);
});
