#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import fs from 'fs-extra';
import { freezeVersion } from '../../scripts/version-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function runVersioning(args) {
  console.log(chalk.cyan('\n📚 Mintlify Documentation Versioning Setup\n'));
  
  // Check where docs.json is located
  const docsJsonPath = await fs.pathExists('docs.json') ? 'docs.json' : 
                       await fs.pathExists('docs/docs.json') ? 'docs/docs.json' : null;
  
  if (!docsJsonPath) {
    console.log(chalk.red('✗ No docs.json found'));
    console.log(chalk.yellow('Please run "npx mintlifier init" first to create your documentation configuration'));
    process.exit(1);
  }
  
  const docsDir = path.dirname(docsJsonPath);
  console.log(chalk.gray(`Found docs.json in: ${docsDir === '.' ? 'current directory' : docsDir}`));
  
  // Check if versioning is already set up
  const docsConfig = await fs.readJson(docsJsonPath);
  const hasVersioning = docsConfig.navigation?.versions?.length > 0;
  
  if (hasVersioning) {
    console.log(chalk.green('✓ Versioning is already set up'));
    console.log(chalk.cyan('\nCurrent versions:'));
    
    const versions = docsConfig.navigation.versions;
    versions.forEach(v => {
      const marker = v.default ? ' (default)' : '';
      console.log(`  • ${v.version}${marker}`);
    });
    
    // Check for versions.json
    const versionsJsonPath = path.join(docsDir, 'versions.json');
    if (await fs.pathExists(versionsJsonPath)) {
      const versionsData = await fs.readJson(versionsJsonPath);
      if (versionsData.currentVersion) {
        console.log(chalk.yellow(`\nCurrent development version: ${versionsData.currentVersion}`));
      }
      if (versionsData.workingVersion) {
        console.log(chalk.blue(`Working directory: ${versionsData.workingVersion}/`));
      }
    }
    
    console.log(chalk.cyan('\n📋 Available actions:'));
    console.log('  • Freeze current version:  npx mintlifier freeze');
    console.log('  • Edit configuration:       npx mintlifier edit');
    
    // Also show local script if it exists
    const freezeScriptPath = path.join(docsDir, 'scripts', 'freeze-version.js');
    if (await fs.pathExists(freezeScriptPath)) {
      console.log(chalk.gray(`\n  Or use local script: node ${path.relative(process.cwd(), freezeScriptPath)}`));
    }
  } else {
    console.log(chalk.yellow('ℹ  Documentation is not versioned yet'));
    console.log(chalk.cyan('\nSetting up versioning will:'));
    console.log('  1. Organize your docs into version directories');
    console.log('  2. Enable version switching in your documentation');
    console.log('  3. Create scripts for freezing versions');
    console.log('  4. Set up a workflow for managing releases\n');
    
    // Run the version manager setup
    try {
      // Change to docs directory if needed
      const originalCwd = process.cwd();
      if (docsDir !== '.') {
        process.chdir(docsDir);
      }
      
      await freezeVersion();
      
      // Change back
      if (docsDir !== '.') {
        process.chdir(originalCwd);
      }
      
      console.log(chalk.green('\nVersioning setup complete.'));
      console.log(chalk.cyan('\nNext steps:'));
      console.log('  1. Review and commit the changes');
      console.log('  2. Continue developing in your working version');
      console.log('  3. When ready to release, run: npx mintlifier freeze');
    } catch (error) {
      if (error.message?.includes('cancelled')) {
        console.log(chalk.gray('\nVersioning setup cancelled'));
      } else {
        console.error(chalk.red('Error setting up versioning:'), error);
        process.exit(1);
      }
    }
  }
}