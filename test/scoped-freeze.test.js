import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import fs from 'fs-extra';

import {
  applyScopedFreezePlan,
  buildScopedFreezePlan,
  recoverInterruptedFreeze
} from '../lib/scoped-freeze.js';

function productVersionedConfig() {
  return {
    name: 'Scoped Docs',
    theme: 'mint',
    colors: {
      primary: '#0D9373'
    },
    navigation: {
      dropdowns: [
        {
          dropdown: 'Cosmos EVM',
          versions: [
            {
              version: 'next',
              default: true,
              groups: [
                {
                  group: 'Guides',
                  pages: ['evm/next/intro', 'evm/next/install']
                }
              ]
            },
            {
              version: 'v0.5.0',
              groups: [
                {
                  group: 'Guides',
                  pages: ['evm/v0.5.0/intro']
                }
              ]
            }
          ]
        },
        {
          dropdown: 'SDKs',
          versions: [
            {
              version: 'next',
              default: true,
              groups: [
                {
                  group: 'SDKs',
                  pages: ['sdks/next/javascript']
                }
              ]
            }
          ]
        }
      ]
    }
  };
}

test('buildScopedFreezePlan scopes navigation updates to the selected product', () => {
  const docsConfig = productVersionedConfig();
  const originalSdkDropdown = structuredClone(docsConfig.navigation.dropdowns[1]);
  const versionsData = {
    versionSchema: 2,
    scopes: {
      'dropdown:cosmos-evm': {
        versions: ['v0.5.0'],
        currentVersion: 'v0.5.0',
        workingVersion: 'next',
        defaultVersion: 'next'
      }
    }
  };

  const plan = buildScopedFreezePlan({
    docsConfig,
    versionsData,
    scope: 'cosmos-evm',
    currentVersion: 'v0.6.0',
    nextVersion: 'next'
  });

  assert.equal(plan.scope.id, 'dropdown:cosmos-evm');
  assert.equal(plan.scope.label, 'Cosmos EVM');
  assert.deepEqual(plan.fileCopies, [
    {
      source: 'evm/next/intro.mdx',
      target: 'evm/v0.6.0/intro.mdx'
    },
    {
      source: 'evm/next/install.mdx',
      target: 'evm/v0.6.0/install.mdx'
    }
  ]);

  assert.deepEqual(
    plan.updatedDocsConfig.navigation.dropdowns[0].versions.map((version) => version.version),
    ['next', 'v0.6.0', 'v0.5.0']
  );
  assert.deepEqual(
    plan.updatedDocsConfig.navigation.dropdowns[0].versions[1].groups[0].pages,
    ['evm/v0.6.0/intro', 'evm/v0.6.0/install']
  );
  assert.deepEqual(plan.updatedDocsConfig.navigation.dropdowns[1], originalSdkDropdown);
  assert.deepEqual(plan.updatedVersionsData.scopes['dropdown:cosmos-evm'], {
    versions: ['v0.6.0', 'v0.5.0'],
    currentVersion: 'next',
    workingVersion: 'next',
    defaultVersion: 'v0.6.0'
  });
});

test('applyScopedFreezePlan copies and rewrites only files in the selected scope', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-scoped-freeze-'));
  const docsDir = path.join(projectRoot, 'docs');
  const docsJsonPath = path.join(projectRoot, 'docs.json');
  const versionsJsonPath = path.join(docsDir, 'versions.json');
  const docsConfig = productVersionedConfig();
  const versionsData = {
    versionSchema: 2,
    scopes: {
      'dropdown:cosmos-evm': {
        versions: ['v0.5.0'],
        currentVersion: 'v0.5.0',
        workingVersion: 'next',
        defaultVersion: 'next'
      }
    }
  };

  await fs.outputFile(
    path.join(docsDir, 'evm/next/intro.mdx'),
    '# Intro\n\n[Install](/evm/next/install "Install")\n\n[Query](/evm/next/install?mode=fast#usage \'Query\')\n\n[Local](./setup)\n\n[Shared](../shared/guide)\n\n[Logo](/images/logo.png)\n'
  );
  await fs.outputFile(path.join(docsDir, 'evm/next/install.mdx'), '# Install\n');
  await fs.outputFile(path.join(docsDir, 'sdks/next/javascript.mdx'), '# JavaScript SDK\n');
  await fs.writeJson(docsJsonPath, docsConfig, { spaces: 2 });
  await fs.writeJson(versionsJsonPath, versionsData, { spaces: 2 });

  const plan = buildScopedFreezePlan({
    docsConfig,
    versionsData,
    scope: 'cosmos-evm',
    currentVersion: 'v0.6.0',
    nextVersion: 'next'
  });

  await applyScopedFreezePlan({
    docsDir,
    docsJsonPath,
    versionsJsonPath,
    plan,
    now: new Date('2026-07-06T12:00:00.000Z')
  });

  assert.equal(await fs.pathExists(path.join(docsDir, 'evm/v0.6.0/intro.mdx')), true);
  assert.equal(await fs.pathExists(path.join(docsDir, 'evm/v0.6.0/install.mdx')), true);
  assert.equal(await fs.pathExists(path.join(docsDir, 'sdks/v0.6.0/javascript.mdx')), false);

  const frozenIntro = await fs.readFile(path.join(docsDir, 'evm/v0.6.0/intro.mdx'), 'utf8');
  assert.match(frozenIntro, /\[Install\]\(\/evm\/v0\.6\.0\/install "Install"\)/);
  assert.match(frozenIntro, /\[Query\]\(\/evm\/v0\.6\.0\/install\?mode=fast#usage 'Query'\)/);
  assert.match(frozenIntro, /\[Local\]\(\.\/setup\)/);
  assert.match(frozenIntro, /\[Shared\]\(\.\.\/shared\/guide\)/);
  assert.match(frozenIntro, /\[Logo\]\(\/images\/logo\.png\)/);

  const updatedDocsConfig = await fs.readJson(docsJsonPath);
  assert.deepEqual(
    updatedDocsConfig.navigation.dropdowns[0].versions.map((version) => version.version),
    ['next', 'v0.6.0', 'v0.5.0']
  );
  assert.deepEqual(
    updatedDocsConfig.navigation.dropdowns[1].versions.map((version) => version.version),
    ['next']
  );

  const updatedVersionsData = await fs.readJson(versionsJsonPath);
  assert.deepEqual(updatedVersionsData.scopes['dropdown:cosmos-evm'].versions, ['v0.6.0', 'v0.5.0']);

  const metadata = await fs.readJson(path.join(docsDir, 'evm/v0.6.0/.version-metadata.json'));
  assert.deepEqual(metadata, {
    version: 'v0.6.0',
    scope: 'dropdown:cosmos-evm',
    scopeLabel: 'Cosmos EVM',
    frozenDate: '2026-07-06',
    frozenTimestamp: '2026-07-06T12:00:00.000Z',
    nextVersion: 'next',
    nodeVersion: process.version
  });
  assert.equal(
    await fs.pathExists(path.join(projectRoot, '.mintlifier-freeze-transaction.json')),
    false
  );
});

test('prepared freeze transactions recover configs and partial targets', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-recovery-'));
  const transactionPath = path.join(root, '.mintlifier-freeze-transaction.json');
  const originalDocsConfig = { navigation: { pages: ['docs/next/intro'] } };
  const originalVersionsData = { workingVersion: 'next' };
  await fs.writeJson(path.join(root, 'docs.json'), { changed: true });
  await fs.outputJson(path.join(root, 'docs/versions.json'), { changed: true });
  await fs.outputFile(path.join(root, 'docs/v1/intro.mdx'), 'partial');
  await fs.outputFile(path.join(root, '.mintlifier-stage-test/file'), 'staged');
  await fs.writeJson(transactionPath, {
    state: 'prepared',
    docsJsonPath: 'docs.json',
    versionsJsonPath: 'docs/versions.json',
    versionsExisted: true,
    originalDocsConfig,
    originalVersionsData,
    targets: ['docs/v1/intro.mdx'],
    stagingDir: '.mintlifier-stage-test'
  });

  const result = await recoverInterruptedFreeze({ transactionPath });
  assert.equal(result.recovered, true);
  assert.deepEqual(await fs.readJson(path.join(root, 'docs.json')), originalDocsConfig);
  assert.deepEqual(await fs.readJson(path.join(root, 'docs/versions.json')), originalVersionsData);
  assert.equal(await fs.pathExists(path.join(root, 'docs/v1/intro.mdx')), false);
  assert.equal(await fs.pathExists(transactionPath), false);
});

test('committed freeze transactions retain promoted files during cleanup', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-recovery-'));
  const transactionPath = path.join(root, '.mintlifier-freeze-transaction.json');
  await fs.outputFile(path.join(root, 'docs/v1/intro.mdx'), 'complete');
  await fs.writeJson(transactionPath, {
    state: 'committed',
    docsJsonPath: 'docs.json',
    versionsJsonPath: 'docs/versions.json',
    targets: ['docs/v1/intro.mdx']
  });

  const result = await recoverInterruptedFreeze({ transactionPath });
  assert.equal(result.recovered, false);
  assert.equal(await fs.readFile(path.join(root, 'docs/v1/intro.mdx'), 'utf8'), 'complete');
  assert.equal(await fs.pathExists(transactionPath), false);
});

test('scoped freeze detects every missing source before copying any page', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-scoped-preflight-'));
  const docsDir = path.join(projectRoot, 'docs');
  const docsJsonPath = path.join(projectRoot, 'docs.json');
  const versionsJsonPath = path.join(docsDir, 'versions.json');
  const docsConfig = productVersionedConfig();
  const versionsData = {
    versionSchema: 2,
    scopes: {
      'dropdown:cosmos-evm': {
        versions: ['v0.5.0'],
        currentVersion: 'v0.5.0',
        workingVersion: 'next',
        defaultVersion: 'next'
      }
    }
  };
  await fs.outputFile(path.join(docsDir, 'evm/next/intro.mdx'), '# Intro\n');
  await fs.writeJson(docsJsonPath, docsConfig);
  await fs.writeJson(versionsJsonPath, versionsData);

  const plan = buildScopedFreezePlan({
    docsConfig,
    versionsData,
    scope: 'cosmos-evm',
    currentVersion: 'v0.6.0',
    nextVersion: 'next'
  });

  await assert.rejects(
    applyScopedFreezePlan({ docsDir, docsJsonPath, versionsJsonPath, plan }),
    /Source page not found.*evm\/next\/install\.mdx/
  );
  assert.equal(
    await fs.pathExists(path.join(docsDir, 'evm/v0.6.0/intro.mdx')),
    false
  );
  assert.deepEqual(await fs.readJson(docsJsonPath), docsConfig);
  assert.deepEqual(await fs.readJson(versionsJsonPath), versionsData);
});

test('scoped freeze rejects a non-file source before copying any page', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-scoped-preflight-'));
  const docsDir = path.join(projectRoot, 'docs');
  const docsJsonPath = path.join(projectRoot, 'docs.json');
  const versionsJsonPath = path.join(docsDir, 'versions.json');
  const docsConfig = productVersionedConfig();
  const versionsData = {
    versionSchema: 2,
    scopes: {
      'dropdown:cosmos-evm': {
        versions: ['v0.5.0'],
        currentVersion: 'v0.5.0',
        workingVersion: 'next',
        defaultVersion: 'next'
      }
    }
  };
  await fs.outputFile(path.join(docsDir, 'evm/next/intro.mdx'), '# Intro\n');
  await fs.ensureDir(path.join(docsDir, 'evm/next/install.mdx'));
  await fs.writeJson(docsJsonPath, docsConfig);
  await fs.writeJson(versionsJsonPath, versionsData);
  const plan = buildScopedFreezePlan({
    docsConfig,
    versionsData,
    scope: 'cosmos-evm',
    currentVersion: 'v0.6.0',
    nextVersion: 'next'
  });

  await assert.rejects(
    applyScopedFreezePlan({ docsDir, docsJsonPath, versionsJsonPath, plan }),
    /Source page is not a file.*evm\/next\/install\.mdx/
  );
  assert.equal(await fs.pathExists(path.join(docsDir, 'evm/v0.6.0/intro.mdx')), false);
});

test('scoped freeze rejects symbolic-link sources', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-scoped-symlink-'));
  const docsDir = path.join(root, 'docs');
  await fs.outputFile(path.join(root, 'outside.mdx'), '# Outside\n');
  await fs.ensureDir(path.join(docsDir, 'evm/next'));
  await fs.symlink(path.join(root, 'outside.mdx'), path.join(docsDir, 'evm/next/intro.mdx'));
  const docsConfig = productVersionedConfig();
  const plan = buildScopedFreezePlan({
    docsConfig,
    versionsData: {},
    scope: 'cosmos-evm',
    currentVersion: 'v0.6.0',
    nextVersion: 'next'
  });
  plan.fileCopies = [plan.fileCopies[0]];

  await assert.rejects(
    applyScopedFreezePlan({
      docsDir,
      docsJsonPath: path.join(root, 'docs.json'),
      versionsJsonPath: path.join(root, 'versions.json'),
      plan
    }),
    /must not be a symbolic link/
  );
});

test('scoped freeze rejects traversal before copying any page', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-scoped-traversal-'));
  const docsConfig = productVersionedConfig();
  const plan = buildScopedFreezePlan({
    docsConfig,
    versionsData: {},
    scope: 'cosmos-evm',
    currentVersion: 'v0.6.0',
    nextVersion: 'next'
  });
  plan.fileCopies[0].target = '../../outside.mdx';
  await assert.rejects(
    applyScopedFreezePlan({
      docsDir: path.join(root, 'docs'),
      docsJsonPath: path.join(root, 'docs.json'),
      versionsJsonPath: path.join(root, 'versions.json'),
      plan
    }),
    /Invalid freeze target.*traversal/
  );
});
