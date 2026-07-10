import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { planGeneratedPages } from '../lib/page-planner.js';
import { normalizeProjectRelativePath, resolveWithin } from '../lib/safe-path.js';

test('normalizes project-root paths without treating them as filesystem roots', () => {
  assert.equal(normalizeProjectRelativePath('/docs/setup.mdx'), 'docs/setup.mdx');
  assert.equal(resolveWithin('/tmp/project', '/docs/setup.mdx'), path.resolve('/tmp/project/docs/setup.mdx'));
});

test('rejects traversal and platform-specific absolute paths', () => {
  for (const candidate of ['../outside', 'docs/../../outside', 'C:\\outside', '\\\\server\\share']) {
    assert.throws(() => resolveWithin('/tmp/project', candidate), /Invalid path/);
  }
});

test('rejects traversal in generated navigation before files are planned', () => {
  assert.throws(
    () => planGeneratedPages({ pages: ['docs/../../outside'] }),
    /Invalid navigation page.*traversal/
  );
});
