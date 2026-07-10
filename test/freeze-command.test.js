import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFreezeArgs } from '../lib/commands/freeze.js';

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
