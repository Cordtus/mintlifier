#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test the new automation functionality
 */
class AutomationTestRunner {
  constructor() {
    this.results = [];
    this.testDir = path.join(__dirname, 'test-automation-outputs');
  }

  async setup() {
    // Clean test directory
    await fs.remove(this.testDir);
    await fs.ensureDir(this.testDir);
  }

  /**
   * Test automated freeze functionality
   */
  async testAutomatedFreeze() {
    console.log(chalk.blue('\n🤖 Testing automated version freeze'));
    
    const testPath = path.join(this.testDir, 'automated-freeze');
    await fs.ensureDir(testPath);
    
    // Create a basic project structure for testing
    await this.createTestProject(testPath);
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testPath);
    
    try {
      // Test automated freeze with environment variables
      const env = {
        ...process.env,
        CURRENT_VERSION: 'v1.0.0',
        NEW_VERSION: 'v1.1.0',
        AUTOMATED: 'true'
      };
      
      const result = await this.runCommand(['node', path.join(__dirname, '..', 'bin', 'mintlifier.js'), 'freeze', '--automated'], {
        env,
        timeout: 15000
      });
      
      // Validate results
      const validations = [];
      
      // Check if version was frozen (should be in docs/ subdirectory)
      const frozenDir = path.join('docs', 'v1.0.0');
      validations.push({
        test: 'frozen version directory created',
        passed: await fs.pathExists(frozenDir)
      });
      
      // Check if versions.json was updated (version manager creates it in docs/)
      const versionsJsonPath = path.join('docs', 'versions.json');
      if (await fs.pathExists(versionsJsonPath)) {
        const versionsData = await fs.readJson(versionsJsonPath);
        validations.push({
          test: 'versions.json updated with current version',
          passed: versionsData.currentVersion === 'v1.1.0'
        });
        validations.push({
          test: 'versions.json includes frozen version',
          passed: versionsData.versions.includes('v1.0.0')
        });
      } else {
        validations.push({
          test: 'versions.json exists',
          passed: false
        });
      }
      
      // Check if docs.json navigation was updated
      const docsJsonPath = path.join('docs.json');
      if (await fs.pathExists(docsJsonPath)) {
        const docsConfig = await fs.readJson(docsJsonPath);
        const hasVersionedNav = docsConfig.navigation?.versions?.some(v => v.version === 'v1.0.0');
        validations.push({
          test: 'docs.json navigation updated with frozen version',
          passed: hasVersionedNav
        });
      }
      
      // Check metadata files
      validations.push({
        test: 'version metadata created',
        passed: await fs.pathExists(path.join(frozenDir, '.version-metadata.json'))
      });
      
      validations.push({
        test: 'version frozen marker created',
        passed: await fs.pathExists(path.join(frozenDir, '.version-frozen'))
      });
      
      return {
        name: 'automated-freeze',
        success: result.exitCode === 0,
        validations,
        output: result.output,
        exitCode: result.exitCode
      };
      
    } finally {
      process.chdir(originalCwd);
    }
  }

  /**
   * Test workflow generation
   */
  async testWorkflowGeneration() {
    console.log(chalk.blue('\n⚙️ Testing workflow generation'));
    
    const testPath = path.join(this.testDir, 'workflow-generation');
    await fs.ensureDir(testPath);
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testPath);
    
    try {
      // Create a script to automatically answer prompts for workflow generation
      const inputScript = [
        '1', // Auto-freeze workflow
        'owner/source-repo', // Source repo
        'docs-version-freeze', // Event type
        '18' // Node version
      ].join('\n');
      
      const result = await this.runCommandWithInput(['node', path.join(__dirname, '..', 'bin', 'mintlifier.js'), 'workflows'], inputScript);
      
      const validations = [];
      
      // Check if workflow file was created
      const workflowPath = path.join('.github', 'workflows', 'auto-freeze-version.yml');
      validations.push({
        test: 'GitHub Actions workflow created',
        passed: await fs.pathExists(workflowPath)
      });
      
      if (await fs.pathExists(workflowPath)) {
        const workflowContent = await fs.readFile(workflowPath, 'utf8');
        
        validations.push({
          test: 'workflow contains repository_dispatch trigger',
          passed: workflowContent.includes('repository_dispatch')
        });
        
        validations.push({
          test: 'workflow contains automated freeze command',
          passed: workflowContent.includes('freeze --automated')
        });
        
        validations.push({
          test: 'workflow contains PR creation',
          passed: workflowContent.includes('gh pr create')
        });
      }
      
      return {
        name: 'workflow-generation',
        success: result.exitCode === 0,
        validations,
        output: result.output,
        exitCode: result.exitCode
      };
      
    } finally {
      process.chdir(originalCwd);
    }
  }

  /**
   * Test command line argument parsing
   */
  async testCommandLineArgs() {
    console.log(chalk.blue('\n📝 Testing command line argument parsing'));
    
    const testPath = path.join(this.testDir, 'cli-args');
    await fs.ensureDir(testPath);
    
    // Create a basic project structure
    await this.createTestProject(testPath);
    
    const originalCwd = process.cwd();
    process.chdir(testPath);
    
    try {
      // Test freeze command with explicit version arguments
      const result = await this.runCommand([
        'node', 
        path.join(__dirname, '..', 'bin', 'mintlifier.js'), 
        'freeze', 
        '--automated',
        '--version=v2.0.0',
        '--next=v2.1.0'
      ], {
        timeout: 15000
      });
      
      const validations = [];
      
      // Check if the specific version was frozen
      const frozenDir = path.join('docs', 'v2.0.0');
      validations.push({
        test: 'specific version frozen via CLI args',
        passed: await fs.pathExists(frozenDir)
      });
      
      // Check versions.json for the new version (version manager creates it in docs/)
      const versionsJsonPath = path.join('docs', 'versions.json');
      if (await fs.pathExists(versionsJsonPath)) {
        const versionsData = await fs.readJson(versionsJsonPath);
        validations.push({
          test: 'current version updated to v2.1.0',
          passed: versionsData.currentVersion === 'v2.1.0'
        });
      }
      
      return {
        name: 'cli-args',
        success: result.exitCode === 0,
        validations,
        output: result.output,
        exitCode: result.exitCode
      };
      
    } finally {
      process.chdir(originalCwd);
    }
  }

  /**
   * Create a minimal test project structure
   */
  async createTestProject(testPath) {
    // Create docs.json
    const docsConfig = {
      "$schema": "https://mintlify.com/docs.json",
      "name": "Test Documentation",
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
    
    await fs.writeJson(path.join(testPath, 'docs.json'), docsConfig, { spaces: 2 });
    
    // Create docs directory structure
    const docsDir = path.join(testPath, 'docs');
    const nextDir = path.join(docsDir, 'next');
    await fs.ensureDir(nextDir);
    
    // Create sample MDX file
    await fs.writeFile(path.join(nextDir, 'introduction.mdx'), `---
title: Introduction
description: Welcome to our documentation
---

# Introduction

This is a test documentation file.
`);
    
    // Create initial versions.json in root (where docs.json is)
    const versionsData = {
      versions: ["next"],
      currentVersion: "v1.0.0",
      workingVersion: "next"
    };
    
    await fs.writeJson(path.join(testPath, 'versions.json'), versionsData, { spaces: 2 });
  }

  /**
   * Run a command and return result
   */
  async runCommand(args, options = {}) {
    const { env = process.env, timeout = 10000 } = options;
    
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

      // Timeout handling
      setTimeout(() => {
        child.kill();
        resolve({
          exitCode: -1,
          output: output + errorOutput + '\n[TIMEOUT]',
          stdout: output,
          stderr: errorOutput,
          timeout: true
        });
      }, timeout);
    });
  }

  /**
   * Run a command with input
   */
  async runCommandWithInput(args, input) {
    return new Promise((resolve) => {
      const child = spawn(args[0], args.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe']
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

      // Send input
      child.stdin.write(input + '\n');
      child.stdin.end();

      // Timeout
      setTimeout(() => {
        child.kill();
        resolve({
          exitCode: -1,
          output: output + errorOutput + '\n[TIMEOUT]',
          timeout: true
        });
      }, 15000);
    });
  }

  /**
   * Run all automation tests
   */
  async runAllTests() {
    console.log(chalk.cyan.bold('\n🚀 Mintlifier Automation Test Suite'));
    console.log('═'.repeat(60));

    const tests = [
      () => this.testAutomatedFreeze(),
      () => this.testWorkflowGeneration(),
      () => this.testCommandLineArgs()
    ];

    for (const test of tests) {
      try {
        const result = await test();
        result.passed = result.success && result.validations.every(v => v.passed);
        this.results.push(result);
      } catch (error) {
        this.results.push({
          name: 'unknown-test',
          success: false,
          passed: false,
          error: error.message,
          validations: []
        });
      }
    }

    this.printResults();
    return this.results.every(r => r.passed);
  }

  printResults() {
    console.log(chalk.cyan('\n\n🔍 Automation Test Results'));
    console.log('═'.repeat(60));

    let passed = 0;
    let failed = 0;

    for (const result of this.results) {
      const status = result.passed ? chalk.green('✓ PASSED') : chalk.red('✗ FAILED');
      console.log(`\n${status} - ${result.name}`);
      
      if (result.validations) {
        for (const validation of result.validations) {
          const vStatus = validation.passed ? chalk.green('  ✓') : chalk.red('  ✗');
          console.log(`${vStatus} ${validation.test}`);
        }
      }

      if (result.error) {
        console.log(chalk.red(`  Error: ${result.error}`));
      }

      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log(chalk.cyan('Automation Test Summary:'));
    console.log(chalk.green(`  ✓ Passed: ${passed}`));
    console.log(chalk.red(`  ✗ Failed: ${failed}`));
    console.log(chalk.blue(`  📊 Total:  ${this.results.length}`));

    return failed === 0;
  }

  async cleanup() {
    const keepOutputs = process.argv.includes('--keep');
    
    if (!keepOutputs) {
      console.log(chalk.gray('\n🧹 Cleaning up automation test outputs...'));
      await fs.remove(this.testDir);
    } else {
      console.log(chalk.gray(`\n📁 Automation test outputs saved in: ${this.testDir}`));
    }
  }
}

// Main execution
async function main() {
  const runner = new AutomationTestRunner();
  
  try {
    await runner.setup();
    const allPassed = await runner.runAllTests();
    await runner.cleanup();
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('\n❌ Automation test suite failed:'), error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { AutomationTestRunner };