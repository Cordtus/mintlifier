import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findVersionScopes,
  findVersionNodes,
  hasVersioning,
  resolveVersionScope,
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

test('findVersionScopes returns stable ids and aliases for root and product scopes', () => {
  const navigation = {
    versions: [
      {
        version: 'next',
        pages: ['next/index']
      }
    ],
    dropdowns: [
      {
        dropdown: 'Cosmos EVM',
        versions: [
          {
            version: 'next',
            pages: ['evm/next/intro']
          },
          {
            version: 'v0.5.0',
            pages: ['evm/v0.5.0/intro']
          }
        ]
      }
    ]
  };

  const scopes = findVersionScopes(navigation).map((scope) => ({
    id: scope.id,
    label: scope.label,
    path: scope.path,
    versions: scope.versions,
    aliases: scope.aliases
  }));

  assert.deepEqual(scopes, [
    {
      id: 'root',
      label: 'Global navigation',
      path: ['versions'],
      versions: ['next'],
      aliases: ['root', 'global', 'navigation']
    },
    {
      id: 'dropdown:cosmos-evm',
      label: 'Cosmos EVM',
      path: ['dropdowns', 0, 'versions'],
      versions: ['next', 'v0.5.0'],
      aliases: ['dropdown:cosmos-evm', 'cosmos-evm', 'Cosmos EVM']
    }
  ]);

  assert.equal(resolveVersionScope(scopes, 'cosmos-evm').id, 'dropdown:cosmos-evm');
  assert.equal(resolveVersionScope(scopes, 'root').id, 'root');
});
