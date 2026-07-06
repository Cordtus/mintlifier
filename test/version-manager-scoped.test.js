import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import fs from 'fs-extra';

import { freezeVersion } from '../scripts/version-manager.js';

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

test('freezeVersion handles a non-interactive product-scoped freeze', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-version-manager-'));
  const docsDir = path.join(projectRoot, 'docs');
  const originalCwd = process.cwd();

  await fs.ensureDir(docsDir);
  await fs.writeJson(path.join(projectRoot, 'docs.json'), productVersionedConfig(), { spaces: 2 });
  await fs.writeJson(path.join(docsDir, 'versions.json'), {
    versionSchema: 2,
    scopes: {
      'dropdown:cosmos-evm': {
        versions: ['v0.5.0'],
        currentVersion: 'v0.5.0',
        workingVersion: 'next',
        defaultVersion: 'next'
      }
    }
  }, { spaces: 2 });
  await fs.outputFile(path.join(docsDir, 'evm/next/intro.mdx'), '# Intro\n\n[Install](/evm/next/install)\n');
  await fs.outputFile(path.join(docsDir, 'evm/next/install.mdx'), '# Install\n');
  await fs.outputFile(path.join(docsDir, 'sdks/next/javascript.mdx'), '# JavaScript SDK\n');

  try {
    process.chdir(projectRoot);
    await freezeVersion({
      scope: 'cosmos-evm',
      version: 'v0.6.0',
      nextVersion: 'next',
      nonInteractive: true,
      yes: true
    });
  } finally {
    process.chdir(originalCwd);
  }

  assert.equal(await fs.pathExists(path.join(docsDir, 'evm/v0.6.0/intro.mdx')), true);
  assert.equal(await fs.pathExists(path.join(docsDir, 'sdks/v0.6.0/javascript.mdx')), false);

  const docsConfig = await fs.readJson(path.join(projectRoot, 'docs.json'));
  assert.deepEqual(
    docsConfig.navigation.dropdowns[0].versions.map((version) => version.version),
    ['next', 'v0.6.0', 'v0.5.0']
  );
  assert.deepEqual(
    docsConfig.navigation.dropdowns[1].versions.map((version) => version.version),
    ['next']
  );
});
