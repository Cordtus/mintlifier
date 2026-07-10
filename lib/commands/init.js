#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import fs from 'fs-extra';
import { confirm } from '@inquirer/prompts';
import { parseCommandOptions } from '../cli-options.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function runInit(args) {
  try {
    parseCommandOptions('init', args);
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exitCode = 1;
    return;
  }
  console.log(chalk.cyan('\nInitializing Mintlify Documentation Configuration\n'));
  
  // Check if docs.json already exists
  const docsJsonPath = path.join(process.cwd(), 'docs.json');
  const docsDir = path.join(process.cwd(), 'docs');
  const docsJsonInDocsPath = path.join(docsDir, 'docs.json');
  
  let existingPath = null;
  if (await fs.pathExists(docsJsonPath)) {
    existingPath = docsJsonPath;
  } else if (await fs.pathExists(docsJsonInDocsPath)) {
    existingPath = docsJsonInDocsPath;
  }
  
  if (existingPath) {
    console.log(chalk.yellow(`⚠️  Found existing docs.json at ${existingPath}`));
    const overwrite = await confirm({
      message: 'Do you want to edit the existing configuration instead?',
      default: true
    });
    
    if (overwrite) {
      // Switch to edit mode
      const { default: runEdit } = await import('./edit.js');
      return runEdit([existingPath]);
    }
    
    const continueNew = await confirm({
      message: 'Create a new configuration anyway? (This will overwrite the existing one)',
      default: false
    });
    
    if (!continueNew) {
      console.log(chalk.gray('Configuration cancelled'));
      process.exit(0);
    }
  }
  
  // Run the main initialization from index.js
  const indexPath = path.join(__dirname, '..', '..', 'index.js');
  
  // Import and run the main function
  const module = await import(indexPath);
  
  // If index.js exports a function, run it
  if (typeof module.default === 'function') {
    await module.default();
  } else {
    // Otherwise, index.js runs on import
    console.log(chalk.green('Configuration initialization started.\n'));
  }
}
