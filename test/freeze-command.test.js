import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';

import {
  parseFreezeArgs,
  resolveVersioningPaths
} from '../lib/commands/freeze.js';

test('parseFreezeArgs supports scoped non-interactive dry runs', () => {
  assert.deepEqual(
    parseFreezeArgs([
      '--scope',
      'cosmos-evm',
      '--version',
      'v0.6.0',
      '--next-version',
      'next',
      '--dry-run',
      '--automated'
    ]),
    {
      scope: 'cosmos-evm',
      version: 'v0.6.0',
      nextVersion: 'next',
      dryRun: true,
      yes: true,
      nonInteractive: true
    }
  );
});

test('resolveVersioningPaths uses docs/versions.json when docs.json is at project root', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-freeze-command-'));
  const originalCwd = process.cwd();

  await fs.writeJson(path.join(projectRoot, 'docs.json'), {});
  await fs.ensureDir(path.join(projectRoot, 'docs'));
  await fs.writeJson(path.join(projectRoot, 'docs/versions.json'), {});

  try {
    process.chdir(projectRoot);
    assert.deepEqual(await resolveVersioningPaths('docs.json'), {
      docsDir: 'docs',
      versionsJsonPath: 'docs/versions.json'
    });
  } finally {
    process.chdir(originalCwd);
  }
});
