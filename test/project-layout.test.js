import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import fs from 'fs-extra';

import { resolveProjectLayout } from '../lib/project-layout.js';

test('root docs.json uses docs as its content root', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-layout-'));
  await fs.writeJson(path.join(root, 'docs.json'), {});

  assert.deepEqual(await resolveProjectLayout({ cwd: root }), {
    projectRoot: root,
    configPath: path.join(root, 'docs.json'),
    configDir: root,
    contentRoot: path.join(root, 'docs'),
    versionsPath: path.join(root, 'docs', 'versions.json')
  });
});

test('docs/docs.json keeps the repository as project root', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-layout-'));
  await fs.outputJson(path.join(root, 'docs', 'docs.json'), {});

  assert.deepEqual(await resolveProjectLayout({ cwd: root }), {
    projectRoot: root,
    configPath: path.join(root, 'docs', 'docs.json'),
    configDir: path.join(root, 'docs'),
    contentRoot: path.join(root, 'docs'),
    versionsPath: path.join(root, 'docs', 'versions.json')
  });
});

test('an explicit config path resolves relative to the requested cwd', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-layout-'));
  await fs.outputJson(path.join(root, 'documentation', 'docs.json'), {});

  const layout = await resolveProjectLayout({
    cwd: root,
    configPath: 'documentation/docs.json'
  });

  assert.equal(layout.projectRoot, path.join(root, 'documentation'));
  assert.equal(layout.contentRoot, path.join(root, 'documentation', 'docs'));
});

test('missing docs.json reports the searched directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-layout-'));

  await assert.rejects(
    resolveProjectLayout({ cwd: root }),
    { message: `No docs.json found under ${root}` }
  );
});
