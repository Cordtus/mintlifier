#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import fs from 'fs-extra';
import { freezeVersion } from '../../scripts/version-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function runFreeze(args) {
  // Parse command line arguments
  const isAutomated = args.includes('--automated') || args.includes('--ci');
  const currentVersionArg = args.find(arg => arg.startsWith('--version='))?.split('=')[1];
  const newVersionArg = args.find(arg => arg.startsWith('--next='))?.split('=')[1];
  
  if (!isAutomated) {
    console.log(chalk.cyan('\n❄️  Freeze Documentation Version\n'));
  }
  
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
  const hasVersioning = docsConfig.navigation?.versions?.length > 0;
  
  if (!hasVersioning) {
    console.log(chalk.yellow('⚠️  Versioning is not set up yet'));
    console.log(chalk.cyan('\nWould you like to set up versioning first?'));
    console.log(chalk.gray('Run: npx mintlifier versioning\n'));
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
    
    await freezeVersion({
      automated: isAutomated,
      currentVersion: currentVersionArg,
      newVersion: newVersionArg
    });
    
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