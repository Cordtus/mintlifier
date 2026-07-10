import assert from 'node:assert/strict';
import test from 'node:test';

import {
  convertNavigationToVersions,
  navigationPageDefaults
} from '../lib/navigation-editor.js';

test('simple-page defaults come from the existing navigation', () => {
  assert.deepEqual(
    navigationPageDefaults({ pages: ['intro', 'setup'] }),
    ['intro', 'setup']
  );
});

test('simple-page defaults collect pages from grouped navigation', () => {
  assert.deepEqual(navigationPageDefaults({
    groups: [
      { group: 'Start', pages: ['intro', 'setup'] },
      { group: 'Reference', pages: ['api'] }
    ]
  }), ['intro', 'setup', 'api']);
});

test('version conversion preserves grouped navigation and global items', () => {
  const original = {
    global: { tabs: [{ tab: 'Status', href: 'https://status.example.com' }] },
    groups: [{ group: 'Guides', pages: ['intro', 'setup'] }]
  };

  assert.deepEqual(convertNavigationToVersions(original, 'v1.0.0'), {
    global: original.global,
    versions: [{
      version: 'v1.0.0',
      default: true,
      groups: original.groups
    }]
  });
  assert.equal(Object.hasOwn(original, 'versions'), false);
  assert.deepEqual(original.groups[0].pages, ['intro', 'setup']);
});

test('version conversion rejects navigation without page content', () => {
  assert.throws(
    () => convertNavigationToVersions({ global: {} }, 'v1.0.0'),
    /no pages, groups, tabs, dropdowns, or anchors/
  );
});
