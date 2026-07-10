import assert from 'node:assert/strict';
import test from 'node:test';

import {
  planGeneratedPages,
  prefixNavigationPages
} from '../lib/page-planner.js';

test('prefixNavigationPages changes only local pages and roots', () => {
  const navigation = {
    global: { tabs: [{ tab: 'Status', href: 'https://status.example.com' }] },
    groups: [{
      group: 'Guides',
      root: 'overview',
      pages: ['quickstart', 'nested/install', 'https://example.com/reference']
    }]
  };

  assert.deepEqual(prefixNavigationPages(navigation, 'docs'), {
    global: navigation.global,
    groups: [{
      group: 'Guides',
      root: 'docs/overview',
      pages: ['docs/quickstart', 'docs/nested/install', 'https://example.com/reference']
    }]
  });
  assert.equal(navigation.groups[0].root, 'overview');
});

test('planGeneratedPages returns unique MDX files matching page references', () => {
  assert.deepEqual(planGeneratedPages({
    groups: [{ group: 'Guides', pages: ['docs/intro', 'docs/setup', 'docs/intro'] }]
  }), [
    { reference: 'docs/intro', relativePath: 'docs/intro.mdx' },
    { reference: 'docs/setup', relativePath: 'docs/setup.mdx' }
  ]);
});

test('page planning ignores href, OpenAPI, anchors, assets, and snippets', () => {
  const navigation = {
    groups: [{
      group: 'Reference',
      root: 'docs/index#start',
      pages: [
        '/docs/api?view=full',
        'https://example.com',
        'mailto:docs@example.com',
        '#local',
        '/assets/logo.svg',
        '/snippets/shared.mdx'
      ],
      openapi: '/openapi.json'
    }],
    global: { tabs: [{ tab: 'Home', href: '/home' }] }
  };

  assert.deepEqual(planGeneratedPages(navigation), [
    { reference: 'docs/api', relativePath: 'docs/api.mdx' },
    { reference: 'docs/index', relativePath: 'docs/index.mdx' }
  ]);
});
