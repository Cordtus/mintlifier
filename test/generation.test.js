import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import fs from 'fs-extra';

import { generateAutomatedProject } from '../automate-config.js';
import { generateInteractiveProject } from '../index.js';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('bin/mintlifier.js');

test('interactive generation writes pages at its saved navigation paths', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-init-'));
  const config = {
    name: 'Guides',
    theme: 'mint',
    colors: { primary: '#0D9373' },
    navigation: {
      groups: [{ group: 'Start', pages: ['intro', 'nested/setup'] }]
    }
  };

  const result = await generateInteractiveProject(config, {
    outputDir: root,
    showProgress: false
  });
  const saved = await fs.readJson(path.join(root, 'docs.json'));

  assert.deepEqual(saved.navigation.groups[0].pages, [
    'docs/intro',
    'docs/nested/setup'
  ]);
  assert.equal(await fs.pathExists(path.join(root, 'docs/intro.mdx')), true);
  assert.equal(await fs.pathExists(path.join(root, 'docs/nested/setup.mdx')), true);
  assert.equal(result.pages.length, 2);
});

test('auto writes every local navigation page at the referenced path', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-auto-'));
  const output = path.join(root, 'site');
  const result = await generateAutomatedProject({
    outputDir: output,
    name: 'API Docs'
  });
  const config = await fs.readJson(path.join(output, 'docs.json'));

  for (const page of result.pages) {
    assert.equal(
      await fs.pathExists(path.join(output, page.relativePath)),
      true,
      page.reference
    );
  }
  assert.equal(config.name, 'API Docs');
});

test('auto refuses an existing output directory without changing it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-auto-'));
  const output = path.join(root, 'site');
  await fs.outputFile(path.join(output, 'keep.txt'), 'preserve me');

  await assert.rejects(
    generateAutomatedProject({ outputDir: output, name: 'API Docs' }),
    /Output directory already exists/
  );
  assert.equal(
    await fs.readFile(path.join(output, 'keep.txt'), 'utf8'),
    'preserve me'
  );
  assert.deepEqual(await fs.readdir(output), ['keep.txt']);
});

test('auto checks its output target instead of an unrelated root docs.json', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-auto-cli-'));
  await fs.writeJson(path.join(root, 'docs.json'), { name: 'Existing project' });

  await execFileAsync(process.execPath, [
    cliPath,
    'auto',
    '--name',
    'Separate project',
    '--output',
    'generated'
  ], { cwd: root });

  const generated = await fs.readJson(path.join(root, 'generated', 'docs.json'));
  assert.equal(generated.name, 'Separate project');
  assert.deepEqual(await fs.readJson(path.join(root, 'docs.json')), {
    name: 'Existing project'
  });
});
