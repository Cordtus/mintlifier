#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import fs from 'fs-extra';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function runAuto(args) {
  console.log(chalk.cyan('\n🤖 Automated Mintlify Configuration Generation\n'));
  
  // Check if docs.json already exists
  const docsJsonPath = path.join(process.cwd(), 'docs.json');
  
  if (await fs.pathExists(docsJsonPath)) {
    console.log(chalk.yellow(`⚠️  docs.json already exists at ${docsJsonPath}`));
    console.log(chalk.gray('Remove it first or use "npx mintlifier edit" to modify it'));
    process.exit(1);
  }
  
  // Parse command line arguments for customization
  let outputDir = 'mintlify-docs';
  let configName = 'API Documentation';
  
  // Parse args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
      outputDir = args[i + 1];
      i++;
    } else if (args[i] === '--name' || args[i] === '-n') {
      configName = args[i + 1];
      i++;
    }
  }
  
  console.log(chalk.yellow('Configuration:'));
  console.log(`  • Project Name: ${configName}`);
  console.log(`  • Output Directory: ${outputDir}\n`);
  
  // Run the automated configuration script
  const automateScriptPath = path.join(__dirname, '..', '..', 'automate-config.js');
  
  if (!await fs.pathExists(automateScriptPath)) {
    console.log(chalk.red('✗ Automation script not found'));
    process.exit(1);
  }
  
  console.log(chalk.cyan('⚙️  Generating configuration...\n'));
  
  // Execute the automation script
  const child = spawn('node', [automateScriptPath], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      MINTLIFY_OUTPUT_DIR: outputDir,
      MINTLIFY_PROJECT_NAME: configName
    }
  });
  
  child.on('error', (error) => {
    console.error(chalk.red('Failed to run automation script:'), error);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    if (code === 0) {
      console.log(chalk.green('\nAutomated configuration complete.'));
      console.log(chalk.cyan('\nGenerated structure:'));
      console.log(`  ${outputDir}/`);
      console.log(`     docs.json`);
      console.log(`     content directories from navigation`);
      console.log(`     OpenAPI placeholders`);
      console.log(`     changelog/\n`);
      
      console.log(chalk.yellow('Next steps:'));
      console.log(`  1. cd ${outputDir}`);
      console.log('  2. Review and customize docs.json');
      console.log('  3. npx mint@latest dev');
      console.log('  4. npx mint@latest validate');
    } else {
      console.log(chalk.red(`\n✗ Automation failed with code ${code}`));
      process.exit(code);
    }
  });
}
