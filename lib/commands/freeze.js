#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import fs from 'fs-extra';
import { freezeVersion } from '../../scripts/version-manager.js';
import {
  hasVersioning,
  isTopLevelVersionedNavigation
} from '../navigation-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseFreezeArgs(args = []) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--version' || arg === '-v') {
      options.version = args[++i];
    } else if (arg === '--next-version' || arg === '--next') {
      options.nextVersion = args[++i];
    } else if (arg === '--yes' || arg === '-y' || arg === '--automated' || arg === '--non-interactive') {
      options.yes = true;
      options.nonInteractive = true;
    }
  }
  return options;
}

export default async function runFreeze(args) {
  console.log(chalk.cyan('\n❄️  Freeze Documentation Version\n'));
  const options = parseFreezeArgs(args);
  
  // Check where docs.json is located
  const docsJsonPath = await fs.pathExists('docs.json') ? 'docs.json' : 
                       await fs.pathExists('docs/docs.json') ? 'docs/docs.json' : null;
  
  if (!docsJsonPath) {
    console.log(chalk.red('✗ No docs.json found'));
    console.log(chalk.yellow('Please run from your documentation directory'));
    process.exit(1);
  }
  
  const docsDir = path.dirname(docsJsonPath);
  
  // Check if versioning is set up
  const docsConfig = await fs.readJson(docsJsonPath);
  const versioningExists = hasVersioning(docsConfig.navigation);
  
  if (!versioningExists) {
    console.log(chalk.yellow('⚠️  Versioning is not set up yet'));
    console.log(chalk.cyan('\nWould you like to set up versioning first?'));
    console.log(chalk.gray('Run: npx mintlifier versioning\n'));
    process.exit(1);
  }

  if (!isTopLevelVersionedNavigation(docsConfig.navigation)) {
    console.log(chalk.yellow('⚠️  Nested/product-scoped versioning detected'));
    console.log(chalk.gray('The current freezer only supports top-level navigation.versions.'));
    console.log(chalk.gray('Use the project-specific versioning workflow for this repository.'));
    process.exit(1);
  }
  
  // Check for versions.json
  const versionsJsonPath = path.join(docsDir, 'versions.json');
  if (!await fs.pathExists(versionsJsonPath)) {
    console.log(chalk.yellow('⚠️  versions.json not found'));
    console.log(chalk.cyan('Run versioning setup first: npx mintlifier versioning'));
    process.exit(1);
  }
  
  const versionsData = await fs.readJson(versionsJsonPath);
  
  if (versionsData.currentVersion) {
    console.log(chalk.blue(`Current version: ${versionsData.currentVersion}`));
  }
  
  if (versionsData.versions && versionsData.versions.length > 0) {
    console.log(chalk.cyan('\nExisting frozen versions:'));
    versionsData.versions.forEach(v => {
      console.log(`  • ${v}`);
    });
  }
  
  console.log(chalk.yellow('\n📋 This will:'));
  console.log('  1. Create a snapshot of the current version');
  console.log('  2. Update navigation with the frozen version');
  console.log('  3. Prepare for next development version\n');
  
  try {
    // Change to docs directory if needed
    const originalCwd = process.cwd();
    if (docsDir !== '.') {
      process.chdir(docsDir);
    }
    
    await freezeVersion(options);
    
    // Change back
    if (docsDir !== '.') {
      process.chdir(originalCwd);
    }
    
    console.log(chalk.green('\nVersion frozen successfully.'));
    console.log(chalk.cyan('\nDon\'t forget to:'));
    console.log('  1. Commit the changes');
    console.log('  2. Tag the release');
    console.log('  3. Push to repository');
  } catch (error) {
    if (error.message?.includes('cancelled')) {
      console.log(chalk.gray('\nFreeze operation cancelled'));
    } else {
      console.error(chalk.red('Error freezing version:'), error);
      process.exit(1);
    }
  }
}
