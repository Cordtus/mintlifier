import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateMintlifyMDX,
  parseExternalChangelog
} from '../scripts/parse-external-changelog.js';

test('parseExternalChangelog normalizes common changelog headings and categories', () => {
  const changelog = `# Changelog

## Unreleased

### Added
- Draft feature that should not be imported yet

## [v1.2.0] - 2026-03-04

### Added
- Add batch importer [#42](https://github.com/acme/project/pull/42)

### Bugfixes
- Fix retry handling (#43)

### API-Breaking
- Rename status field

## Version 1.1.0 (2026-02-01)

### Updated
- Improve backfill performance

## 1.0.0 - 2026-01-15

### SECURITY
- Rotate webhook secret
`;

  const versions = parseExternalChangelog(changelog);

  assert.equal(versions.length, 3);
  assert.equal(versions[0].version, 'v1.2.0');
  assert.equal(versions[0].date, '2026-03-04');
  assert.deepEqual(versions[0].categories.FEATURES, [
    'Add batch importer (#42)'
  ]);
  assert.deepEqual(versions[0].categories['BUG FIXES'], [
    'Fix retry handling (#43)'
  ]);
  assert.deepEqual(versions[0].categories['BREAKING CHANGES'], [
    'Rename status field'
  ]);
  assert.deepEqual(versions[1].categories.IMPROVEMENTS, [
    'Improve backfill performance'
  ]);
  assert.deepEqual(versions[2].categories.SECURITY, [
    'Rotate webhook secret'
  ]);
});

test('generateMintlifyMDX emits Update components in stable category order', () => {
  const versions = [
    {
      version: 'v1.2.0',
      date: '2026-03-04',
      categories: {
        'BUG FIXES': ['Fix retry handling (#43)'],
        FEATURES: ['Add batch importer (#42)'],
        'BREAKING CHANGES': ['Rename status field']
      }
    }
  ];

  const mdx = generateMintlifyMDX(versions, 'acme/project', 'v1.2.0');

  assert.match(mdx, /import Update from '\/snippets\/update\.mdx'/);
  assert.match(mdx, /Release notes imported from \[acme\/project\]/);
  assert.match(mdx, /<Update title="Version v1\.2\.0" date="2026-03-04">/);

  const breakingIndex = mdx.indexOf('### Breaking Changes');
  const featuresIndex = mdx.indexOf('### Features');
  const fixesIndex = mdx.indexOf('### Bug Fixes');

  assert.ok(breakingIndex > -1);
  assert.ok(featuresIndex > breakingIndex);
  assert.ok(fixesIndex > featuresIndex);
  assert.match(mdx, /- Add batch importer \(#42\)/);
});
