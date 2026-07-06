import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findVersionNodes,
  hasVersioning,
  isSupportedVersionLabel,
  isTopLevelVersionedNavigation
} from '../lib/navigation-utils.js';

test('hasVersioning detects product-scoped dropdown versions', () => {
  const navigation = {
    dropdowns: [
      {
        dropdown: 'Cosmos EVM',
        versions: [
          {
            version: 'next',
            tabs: [
              {
                tab: 'Docs',
                groups: [
                  {
                    group: 'Getting Started',
                    pages: ['evm/next/intro']
                  }
                ]
              }
            ]
          },
          {
            version: 'v0.5.0',
            tabs: [
              {
                tab: 'Docs',
                groups: [
                  {
                    group: 'Getting Started',
                    pages: ['evm/v0.5.0/intro']
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  assert.equal(hasVersioning(navigation), true);
  assert.equal(isTopLevelVersionedNavigation(navigation), false);
  assert.deepEqual(
    findVersionNodes(navigation).map((node) => ({
      path: node.path,
      versions: node.versions
    })),
    [
      {
        path: ['dropdowns', 0, 'versions'],
        versions: ['next', 'v0.5.0']
      }
    ]
  );
});

test('isTopLevelVersionedNavigation identifies flat versioned navigation', () => {
  const navigation = {
    versions: [
      {
        version: 'next',
        pages: ['next/index']
      },
      {
        version: 'v1.0.0',
        pages: ['v1.0.0/index']
      }
    ]
  };

  assert.equal(hasVersioning(navigation), true);
  assert.equal(isTopLevelVersionedNavigation(navigation), true);
  assert.deepEqual(findVersionNodes(navigation)[0].path, ['versions']);
});

test('isSupportedVersionLabel accepts common documentation release labels', () => {
  for (const label of ['next', 'latest', 'main', 'v0.53', 'v8.5.x', 'v25', 'v1.2.3-rc.1']) {
    assert.equal(isSupportedVersionLabel(label), true, label);
  }

  for (const label of ['', ' ', '../v1', 'v1/evil', 'release candidate']) {
    assert.equal(isSupportedVersionLabel(label), false, label);
  }
});
