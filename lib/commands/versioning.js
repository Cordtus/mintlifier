#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs-extra';

import { parseCommandOptions } from '../cli-options.js';
import { findVersionNodes, findVersionScopes, hasVersioning } from '../navigation-utils.js';
import { resolveProjectLayout } from '../project-layout.js';
import { setupVersioning } from '../version-manager.js';

export default async function runVersioning(args) {
  try {
    parseCommandOptions('versioning', args);
    const layout = await resolveProjectLayout();
    let docsConfig = await fs.readJson(layout.configPath);

    if (!hasVersioning(docsConfig.navigation) || !await fs.pathExists(layout.versionsPath)) {
      console.log(chalk.cyan('\nSet up documentation versioning\n'));
      await setupVersioning({ cwd: layout.projectRoot, configPath: layout.configPath });
      docsConfig = await fs.readJson(layout.configPath);
      console.log(chalk.green('Versioning metadata is ready.\n'));
    }

    console.log(`Configuration: ${layout.configPath}`);
    console.log(`Metadata: ${layout.versionsPath}`);
    console.log('\nVersioned navigation:');
    for (const node of findVersionNodes(docsConfig.navigation)) {
      console.log(`  ${node.path.join('.')}`);
      for (const version of node.owner.versions) {
        console.log(`    ${version.version}${version.default ? ' (default)' : ''}`);
      }
    }

    const scopes = findVersionScopes(docsConfig.navigation);
    if (scopes.length > 1 || scopes.some((scope) => scope.id !== 'root')) {
      console.log('\nFreeze scopes:');
      for (const scope of scopes) {
        const alias = scope.aliases.find((value) => !value.includes(':')) || scope.id;
        console.log(`  ${alias}: npx mintlifier freeze --scope ${alias} --version <version> --next-version <next>`);
      }
    } else {
      console.log('\nFreeze a release: npx mintlifier freeze');
    }
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}
