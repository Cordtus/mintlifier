#!/usr/bin/env node

import chalk from 'chalk';

import { parseCommandOptions } from '../cli-options.js';
import { freezeVersion } from '../version-manager.js';

export function parseFreezeArgs(args = []) {
  return parseCommandOptions('freeze', args);
}

export default async function runFreeze(args) {
  try {
    const options = parseFreezeArgs(args);
    const result = await freezeVersion({ cwd: process.cwd(), ...options });

    if (result.dryRun) {
      console.log(chalk.green('Dry run completed. No files were changed.'));
      console.log(`Scope: ${result.plan.scope.label}`);
      console.log(`Version: ${result.plan.currentVersion}`);
      for (const copy of result.plan.fileCopies) {
        console.log(`  ${copy.source} -> ${copy.target}`);
      }
      return;
    }

    console.log(chalk.green(`Frozen ${result.copiedFiles} documentation pages.`));
    console.log('Review docs.json, versions.json, and the generated snapshot before committing.');
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}
