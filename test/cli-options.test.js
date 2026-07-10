import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
  parseCommandOptions,
  parseEditArguments,
  renderCommandHelp
} from '../lib/cli-options.js';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('bin/mintlifier.js');

test('auto accepts long and short value options', () => {
  assert.deepEqual(parseCommandOptions('auto', ['-n', 'API Docs', '-o', 'site']), {
    name: 'API Docs',
    output: 'site'
  });
});

test('freeze accepts aliases and boolean flags', () => {
  assert.deepEqual(parseCommandOptions('freeze', [
    '-s',
    'api',
    '-v',
    'v1.0.0',
    '--next',
    'next',
    '--dry-run',
    '-y'
  ]), {
    scope: 'api',
    version: 'v1.0.0',
    nextVersion: 'next',
    dryRun: true,
    yes: true,
    nonInteractive: true
  });
});

test('options reject missing values and unknown flags', () => {
  assert.throws(
    () => parseCommandOptions('auto', ['--output']),
    /--output requires a value/
  );
  assert.throws(
    () => parseCommandOptions('freeze', ['--force']),
    /Unknown freeze option: --force/
  );
});

test('edit accepts at most one positional config path', () => {
  assert.deepEqual(parseEditArguments([]), {});
  assert.deepEqual(parseEditArguments(['documentation/docs.json']), {
    configPath: 'documentation/docs.json'
  });
  assert.throws(() => parseEditArguments(['one.json', 'two.json']), /one config path/);
  assert.throws(() => parseEditArguments(['--force']), /Unknown edit option/);
});

test('command help lists only supported command options', () => {
  const freezeHelp = renderCommandHelp('freeze');
  assert.match(freezeHelp, /--version/);
  assert.match(freezeHelp, /--dry-run/);
  assert.doesNotMatch(freezeHelp, /--output/);
});

test('command help exits without requiring a project', async () => {
  const { stdout } = await execFileAsync(process.execPath, [cliPath, 'freeze', '--help']);
  assert.match(stdout, /mintlifier freeze/);
  assert.match(stdout, /--next-version/);
});
