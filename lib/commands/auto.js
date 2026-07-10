#!/usr/bin/env node

import path from 'node:path';

import chalk from 'chalk';

import { generateAutomatedProject } from '../../automate-config.js';
import { parseCommandOptions } from '../cli-options.js';

export function parseAutoArgs(args = []) {
  return {
    name: 'API Documentation',
    output: 'mintlify-docs',
    ...parseCommandOptions('auto', args)
  };
}

export default async function runAuto(args) {
  try {
    const options = parseAutoArgs(args);
    const outputDir = path.resolve(process.cwd(), options.output);

    console.log(chalk.cyan('\nAutomated Mintlify project generation\n'));
    console.log(`Name: ${options.name}`);
    console.log(`Output: ${outputDir}\n`);

    const result = await generateAutomatedProject({
      outputDir,
      name: options.name
    });

    console.log(chalk.green('Project generated.'));
    console.log(`Created ${result.pages.length} documentation pages.`);
    console.log('\nNext steps:');
    console.log(`  cd ${options.output}`);
    console.log('  npx mint@latest dev');
    console.log('  npx mint@latest validate');
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}
