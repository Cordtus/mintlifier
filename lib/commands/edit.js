#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import fs from 'fs-extra';
import { editExistingConfig } from '../config-editor.js';
import { select } from '@inquirer/prompts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function runEdit(args) {
  console.log(chalk.cyan('\n✏️  Edit Mintlify Configuration\n'));
  
  // Check if a specific file was provided as argument
  let configPath = args[0];
  
  if (!configPath) {
    // Look for docs.json in common locations
    const possiblePaths = [
      'docs.json',
      'docs/docs.json',
      'documentation/docs.json',
      'mintlify/docs.json'
    ];
    
    const foundPaths = [];
    for (const p of possiblePaths) {
      if (await fs.pathExists(p)) {
        foundPaths.push(p);
      }
    }
    
    if (foundPaths.length === 0) {
      console.log(chalk.red('✗ No docs.json found'));
      console.log(chalk.yellow('\nYou can:'));
      console.log('  1. Specify the path: npx mintlifier edit path/to/docs.json');
      console.log('  2. Create new config: npx mintlifier init');
      process.exit(1);
    } else if (foundPaths.length === 1) {
      configPath = foundPaths[0];
      console.log(chalk.gray(`Found configuration at: ${configPath}`));
    } else {
      // Multiple configs found, let user choose
      configPath = await select({
        message: 'Multiple configurations found. Which one to edit?',
        choices: foundPaths.map(p => ({
          value: p,
          name: p
        }))
      });
    }
  }
  
  // Verify the file exists
  if (!await fs.pathExists(configPath)) {
    console.log(chalk.red(`✗ File not found: ${configPath}`));
    process.exit(1);
  }
  
  // Verify it's a valid JSON file
  try {
    await fs.readJson(configPath);
  } catch (error) {
    console.log(chalk.red(`✗ Invalid JSON file: ${configPath}`));
    console.log(chalk.gray(error.message));
    process.exit(1);
  }
  
  console.log(chalk.yellow(`Editing: ${configPath}\n`));
  
  // Run the config editor
  try {
    await editExistingConfig(configPath);
    console.log(chalk.green('\nConfiguration updated successfully.'));
  } catch (error) {
    if (error.message?.includes('cancelled')) {
      console.log(chalk.gray('\nEdit cancelled'));
    } else {
      console.error(chalk.red('Error editing configuration:'), error);
      process.exit(1);
    }
  }
}