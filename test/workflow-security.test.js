import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workflows = [
  'freeze-version.yml',
  'external-repo-trigger.yml',
  'sync-changelog.yml'
];

function shellBlocks(source) {
  const lines = source.split('\n');
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)run:\s*\|\s*$/);
    if (!match) continue;
    const indent = match[1].length;
    const block = [];
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.trim() && line.match(/^\s*/)[0].length <= indent) {
        index -= 1;
        break;
      }
      block.push(line);
    }
    blocks.push(block.join('\n'));
  }
  return blocks;
}

test('published workflow shell blocks never interpolate GitHub expressions directly', async () => {
  for (const workflow of workflows) {
    const source = await readFile(path.join('workflow-templates', workflow), 'utf8');
    for (const block of shellBlocks(source)) {
      assert.doesNotMatch(block, /\$\{\{/u, `${workflow} must pass expressions through env`);
    }
  }
});

test('published workflows validate user-controlled values before writing outputs', async () => {
  const sources = await Promise.all(workflows.map((workflow) =>
    readFile(path.join('workflow-templates', workflow), 'utf8')
  ));
  for (const source of sources) assert.match(source, /\[\[ ! .* =~ \^\[/u);
});
