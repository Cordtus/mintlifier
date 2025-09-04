#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Integration test for enhanced functionality
 */
async function testAutomationIntegration() {
  console.log(chalk.cyan.bold('\n🧪 Mintlifier Integration Test'));
  console.log('Testing enhanced automation features');
  console.log('═'.repeat(50));

  const testDir = path.join(__dirname, 'integration-test-output');
  
  try {
    // Clean and setup test directory
    await fs.remove(testDir);
    await fs.ensureDir(testDir);
    
    const originalCwd = process.cwd();
    process.chdir(testDir);
    
    console.log(chalk.blue('\n📝 Step 1: Create basic documentation project'));
    
    // Create minimal docs.json with versioned navigation
    const docsConfig = {
      "$schema": "https://mintlify.com/docs.json",
      "name": "Integration Test Docs",
      "favicon": "/favicon.svg",
      "navigation": {
        "versions": [
          {
            "version": "next",
            "default": true,
            "tabs": [
              {
                "tab": "Documentation", 
                "groups": [
                  {
                    "group": "Getting Started",
                    "pages": ["docs/next/introduction"]
                  }
                ]
              }
            ]
          }
        ]
      }
    };
    
    await fs.writeJson('docs.json', docsConfig, { spaces: 2 });
    
    // Create docs structure
    await fs.ensureDir('docs/next');
    await fs.writeFile('docs/next/introduction.mdx', `---
title: Introduction
---

# Introduction

This is our documentation introduction.

Link to [setup guide](docs/next/setup).
`);
    
    await fs.writeFile('docs/next/setup.mdx', `---
title: Setup Guide
---

# Setup Guide

How to get started.
`);

    // Create initial versions.json (this is what the version manager expects)
    const versionsData = {
      versions: ["next"],
      currentVersion: "v1.0.0",
      workingVersion: "next"
    };
    await fs.writeJson('versions.json', versionsData, { spaces: 2 });
    
    console.log(chalk.green('✓ Basic project structure created'));
    
    console.log(chalk.blue('\n🤖 Step 2: Test automated freeze'));
    
    // Test automated freeze
    const freezeResult = await runCommand([
      'node', 
      path.join(__dirname, '..', 'bin', 'mintlifier.js'),
      'freeze',
      '--automated',
      '--version=v1.0.0',
      '--next=v1.1.0'
    ], {
      env: {
        ...process.env,
        AUTOMATED: 'true'
      }
    });
    
    console.log('Freeze command output:');
    console.log(chalk.gray(freezeResult.output));
    
    // Validate results
    const validations = [];
    
    // Check frozen version directory
    const frozenDir = 'docs/v1.0.0';
    const frozenExists = await fs.pathExists(frozenDir);
    validations.push(['Frozen version directory created', frozenExists]);
    
    if (frozenExists) {
      // Check metadata files  
      const metadataExists = await fs.pathExists(path.join(frozenDir, '.version-metadata.json'));
      const markerExists = await fs.pathExists(path.join(frozenDir, '.version-frozen'));
      validations.push(['Version metadata created', metadataExists]);
      validations.push(['Version frozen marker created', markerExists]);
      
      // Check frozen content
      const introExists = await fs.pathExists(path.join(frozenDir, 'introduction.mdx'));
      validations.push(['Documentation files copied', introExists]);
      
      if (introExists) {
        // Check if internal links were updated
        const content = await fs.readFile(path.join(frozenDir, 'introduction.mdx'), 'utf8');
        const hasUpdatedLinks = content.includes('docs/v1.0.0/setup');
        validations.push(['Internal links updated', hasUpdatedLinks]);
      }
    }
    
    // Check versions.json update
    const versionsJsonPath = 'docs/versions.json';
    if (await fs.pathExists(versionsJsonPath)) {
      const updatedVersions = await fs.readJson(versionsJsonPath);
      validations.push(['versions.json includes frozen version', updatedVersions.versions.includes('v1.0.0')]);
      validations.push(['Current version updated', updatedVersions.currentVersion === 'v1.1.0']);
    } else {
      validations.push(['versions.json exists', false]);
    }
    
    // Check docs.json navigation update
    if (await fs.pathExists('docs.json')) {
      const updatedDocsConfig = await fs.readJson('docs.json');
      const hasV100Nav = updatedDocsConfig.navigation?.versions?.some(v => v.version === 'v1.0.0');
      validations.push(['docs.json navigation updated', hasV100Nav]);
    }
    
    console.log(chalk.blue('\n⚙️ Step 3: Test workflow generation'));
    
    // Test workflow generation (with timeout to prevent hanging)
    const workflowInput = '1\nowner/source-repo\ndocs-version-freeze\n18\n';
    const workflowResult = await runCommandWithInput([
      'node',
      path.join(__dirname, '..', 'bin', 'mintlifier.js'),
      'workflows'
    ], workflowInput);
    
    console.log('Workflow generation output:');
    console.log(chalk.gray(workflowResult.output));
    
    // Check if workflow was created
    const workflowPath = '.github/workflows/auto-freeze-version.yml';
    const workflowExists = await fs.pathExists(workflowPath);
    validations.push(['GitHub Actions workflow created', workflowExists]);
    
    if (workflowExists) {
      const workflowContent = await fs.readFile(workflowPath, 'utf8');
      validations.push(['Workflow contains repository_dispatch', workflowContent.includes('repository_dispatch')]);
      validations.push(['Workflow contains automated freeze', workflowContent.includes('freeze --automated')]);
    }
    
    // Print results
    console.log(chalk.cyan('\n🔍 Integration Test Results'));
    console.log('═'.repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    for (const [test, result] of validations) {
      const status = result ? chalk.green('✓') : chalk.red('✗');
      console.log(`${status} ${test}`);
      if (result) {
        passed++;
      } else {
        failed++;
      }
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log(chalk.cyan('Integration Test Summary:'));
    console.log(chalk.green(`✓ Passed: ${passed}`));
    console.log(chalk.red(`✗ Failed: ${failed}`));
    console.log(chalk.blue(`📊 Total: ${validations.length}`));
    
    const allPassed = failed === 0;
    
    if (allPassed) {
      console.log(chalk.green.bold('\n🎉 All integration tests passed!'));
    } else {
      console.log(chalk.red.bold('\n❌ Some integration tests failed.'));
    }
    
    // Show what was created for debugging
    console.log(chalk.gray('\n📁 Generated files:'));
    const files = await listFiles('.');
    files.forEach(file => console.log(chalk.gray(`   ${file}`)));
    
    process.chdir(originalCwd);
    
    // Keep test output for manual inspection
    console.log(chalk.gray(`\n💾 Test output saved in: ${testDir}`));
    
    return allPassed;
    
  } catch (error) {
    console.error(chalk.red('\n❌ Integration test failed:'), error);
    return false;
  }
}

async function runCommand(args, options = {}) {
  const { env = process.env, timeout = 15000 } = options;
  
  return new Promise((resolve) => {
    const child = spawn(args[0], args.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code,
        output: output + errorOutput,
        stdout: output,
        stderr: errorOutput
      });
    });

    setTimeout(() => {
      child.kill();
      resolve({
        exitCode: -1,
        output: output + errorOutput + '\n[TIMEOUT]',
        timeout: true
      });
    }, timeout);
  });
}

async function runCommandWithInput(args, input) {
  return new Promise((resolve) => {
    const child = spawn(args[0], args.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code,
        output
      });
    });

    // Send input and close
    child.stdin.write(input);
    child.stdin.end();

    // Timeout
    setTimeout(() => {
      child.kill();
      resolve({ exitCode: -1, output: output + '\n[TIMEOUT]' });
    }, 10000);
  });
}

async function listFiles(dir, prefix = '') {
  const files = [];
  try {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(`${prefix}${item}/`);
        const subFiles = await listFiles(fullPath, `${prefix}${item}/`);
        files.push(...subFiles);
      } else if (stat.isFile()) {
        files.push(`${prefix}${item}`);
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return files;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAutomationIntegration().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testAutomationIntegration };