#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];

// Display help if no command provided or help requested
if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     ${chalk.bold('Mintlifier')} - Mintlify Documentation Builder          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`));
  
  console.log(chalk.yellow('Usage:'));
  console.log('  npx mintlifier <command> [options]\n');
  
  console.log(chalk.yellow('Commands:'));
  console.log(chalk.green('  init') + '           Create a new Mintlify documentation configuration');
  console.log(chalk.green('  versioning') + '     Set up or manage documentation versioning');
  console.log(chalk.green('  edit') + '           Edit an existing docs.json configuration');
  console.log(chalk.green('  auto') + '           Generate configuration automatically (non-interactive)');
  console.log(chalk.green('  freeze') + '         Freeze current version and start new development version');
  console.log(chalk.green('  help') + '           Show this help message\n');
  
  console.log(chalk.yellow('Examples:'));
  console.log('  npx mintlifier init              # Start interactive configuration');
  console.log('  npx mintlifier versioning         # Set up versioning system');
  console.log('  npx mintlifier edit docs.json     # Edit existing configuration');
  console.log('  npx mintlifier freeze             # Freeze documentation version');
  console.log('  npx mintlifier freeze --scope api-reference --version v2.3.0 --next-version next\n');
  
  console.log(chalk.gray('For more information: https://github.com/Cordtus/mintlifier'));
  process.exit(0);
}

// Version flag
if (command === '--version' || command === '-v') {
  const packageJson = await fs.readJson(path.join(__dirname, '..', 'package.json'));
  console.log(`v${packageJson.version}`);
  process.exit(0);
}

// Route to appropriate command handler
switch (command) {
  case 'init':
  case 'initialize':
  case 'new':
    // Run the main configuration builder
    const { default: runInit } = await import('../lib/commands/init.js');
    await runInit(args.slice(1));
    break;
    
  case 'versioning':
  case 'version':
  case 'versions':
    // Run versioning setup
    const { default: runVersioning } = await import('../lib/commands/versioning.js');
    await runVersioning(args.slice(1));
    break;
    
  case 'edit':
  case 'modify':
  case 'update':
    // Run configuration editor
    const { default: runEdit } = await import('../lib/commands/edit.js');
    await runEdit(args.slice(1));
    break;
    
  case 'auto':
  case 'automatic':
  case 'generate':
    // Run automated configuration
    const { default: runAuto } = await import('../lib/commands/auto.js');
    await runAuto(args.slice(1));
    break;
    
  case 'freeze':
  case 'release':
  case 'version-freeze':
    // Freeze current version
    const { default: runFreeze } = await import('../lib/commands/freeze.js');
    await runFreeze(args.slice(1));
    break;
    
  default:
    console.log(chalk.red(`Unknown command: ${command}`));
    console.log(chalk.yellow('Run "npx mintlifier help" for usage information'));
    process.exit(1);
}
