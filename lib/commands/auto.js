#!/usr/bin/env node

import path from 'node:path';

import chalk from 'chalk';

import { generateAutomatedProject } from '../../automate-config.js';

export function parseAutoArgs(args = []) {
  const options = { name: 'API Documentation', output: 'mintlify-docs' };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const isName = argument === '--name' || argument === '-n';
    const isOutput = argument === '--output' || argument === '-o';
    if (!isName && !isOutput) {
      throw new Error(`Unknown auto option: ${argument}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith('-')) {
      throw new Error(`${argument} requires a value`);
    }
    options[isName ? 'name' : 'output'] = value;
    index += 1;
  }

  return options;
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
