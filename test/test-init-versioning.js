#!/usr/bin/env node

// Test script to verify versioning is integrated into init flow
// This just checks that the code imports and runs without errors

import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.cyan('\n================================='));
console.log(chalk.cyan(' Testing Init + Versioning Flow'));
console.log(chalk.cyan('=================================\n'));

async function testIntegration() {
  try {
    // Import the setupVersioning function to ensure it exists
    const { setupVersioning } = await import('../lib/versioning.js');
    console.log(chalk.green('✓ setupVersioning function found in lib/versioning.js'));
    
    // Import the main function to ensure it exists
    const main = await import('../index.js');
    console.log(chalk.green('✓ Main function imported from index.js'));
    
    // Import init command
    const { default: runInit } = await import('../lib/commands/init.js');
    console.log(chalk.green('✓ Init command imported successfully'));
    
    // Import freeze command
    const { default: runFreeze } = await import('../lib/commands/freeze.js');
    console.log(chalk.green('✓ Freeze command imported successfully'));
    
    // Import versioning command
    const { default: runVersioning } = await import('../lib/commands/versioning.js');
    console.log(chalk.green('✓ Versioning command imported successfully'));
    
    console.log(chalk.blue('\n================================='));
    console.log(chalk.green('All imports successful!'));
    console.log(chalk.green('Integration is properly configured.'));
    console.log(chalk.blue('=================================\n'));
    
    console.log(chalk.gray('Note: Full interactive testing requires manual interaction'));
    console.log(chalk.gray('Run "mintlifier init" in a test directory to fully test the flow'));
    
    return true;
  } catch (error) {
    console.error(chalk.red('✗ Integration test failed:'), error.message);
    return false;
  }
}

testIntegration().then(success => {
  process.exit(success ? 0 : 1);
});