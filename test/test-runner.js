#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configurations
const testConfigs = [
  {
    name: 'minimal',
    inputs: [
      'Mintlifier Test', // name
      '/favicon.svg', // favicon
      '1', // theme: venus
      '2', // layout: sidenav
      '1', // rounded: default
      '\n', // primary color (default)
      'n', // advanced colors
      '3', // no logo
      'y', // add navigation
      'Test Group', // group name
      '2', // page count
      'introduction', // page 1
      'getting-started', // page 2
      'n', // add another group
      'n', // tabs
      'n', // OpenAPI
      'n', // footer
      'n', // analytics
      'n', // feedback
      'n', // search settings
      '1', // light mode default
      'n', // hide mode toggle
      'n', // versioning
      'y', // generate project
      'n', // enable versioning system
    ]
  },
  {
    name: 'with-versioning',
    inputs: [
      'Versioned Docs', // name
      '/favicon.svg', // favicon
      '3', // theme: prism
      '3', // layout: solid sidenav
      '2', // rounded: sharp
      '\n', // primary color
      'y', // advanced colors
      '#07C983', // light color
      '#0D9373', // dark color
      'n', // background colors
      'n', // gradient anchors
      '1', // single logo
      '/logo.svg', // logo path
      'y', // add navigation
      'Docs', // group name
      '3', // page count
      'overview', // page 1
      'installation', // page 2
      'configuration', // page 3
      'n', // add another group
      'n', // tabs
      'n', // OpenAPI
      'n', // footer
      'n', // analytics
      'y', // feedback
      'y', // thumbs rating
      'y', // suggest edit
      'n', // raise issue
      'n', // search settings
      '2', // dark mode default
      'n', // hide mode toggle
      'n', // versioning in navigation
      'y', // generate project
      'y', // enable versioning system
      'v1.0.0', // initial version
      'y', // changelog sync
      '1', // same repository
      'y', // auto version on release
    ]
  },
  {
    name: 'full-features',
    inputs: [
      'Full Featured Docs', // name
      '/favicon.png', // favicon
      '2', // theme: quill
      '1', // layout: topnav
      '1', // rounded: default
      '#3B82F6', // primary color
      'y', // advanced colors
      '#60A5FA', // light color
      '#2563EB', // dark color
      'y', // background colors
      '#FFFFFF', // light background
      '#0F172A', // dark background
      'y', // gradient anchors
      '#3B82F6', // gradient from
      '#8B5CF6', // gradient to
      '2', // dual logo
      '/logo-light.svg', // light logo
      '/logo-dark.svg', // dark logo
      'y', // add logo href
      'https://example.com', // logo link
      'y', // add navigation
      'Getting Started', // group 1 name
      '2', // page count
      'introduction', // page 1
      'quickstart', // page 2
      'y', // add another group
      'API Reference', // group 2 name
      '3', // page count
      'overview', // page 1
      'authentication', // page 2
      'endpoints', // page 3
      'y', // add another group
      'Guides', // group 3 name
      '2', // page count
      'tutorial', // page 1
      'best-practices', // page 2
      'n', // add another group
      'y', // tabs
      'Documentation', // tab name
      'docs', // tab url
      'y', // add another tab
      'API', // tab name
      'api', // tab url
      'n', // add another tab
      'y', // OpenAPI
      '1', // one spec file
      '/openapi.json', // spec path
      'y', // configure base URL
      'https://api.example.com', // base URL
      '2', // auth: bearer
      '1', // playground: show
      'y', // footer
      'y', // social links
      '1\n3\n5\n', // x, discord, linkedin
      'https://x.com/example', // x url
      'https://discord.gg/example', // discord url
      'https://linkedin.com/company/example', // linkedin url
      'y', // analytics
      '1', // GA4
      'G-XXXXXXXXXX', // measurement ID
      'y', // feedback
      'y', // thumbs rating
      'y', // suggest edit
      'y', // raise issue
      'y', // search settings
      'Search docs...', // search prompt
      '1', // location: side
      '2', // dark mode default
      'n', // hide mode toggle
      'y', // versioning
      'v1.0.0', // version 1
      'y', // add another version
      'v2.0.0', // version 2
      'n', // add another version
      'y', // generate project
      'y', // enable versioning
      'v2.0.0', // initial version
      'y', // changelog sync
      '2', // different repository
      'mintlify', // repo owner
      'starter', // repo name
      'y', // auto version
    ]
  }
];

// Test utilities
class TestRunner {
  constructor() {
    this.results = [];
    this.testDir = path.join(__dirname, 'test-outputs');
  }

  async setup() {
    // Clean test directory
    await fs.remove(this.testDir);
    await fs.ensureDir(this.testDir);
  }

  async runTest(config) {
    console.log(chalk.blue(`\n Running test: ${config.name}`));
    
    const testPath = path.join(this.testDir, config.name);
    await fs.ensureDir(testPath);

    // Change to test directory
    process.chdir(testPath);

    return new Promise((resolve) => {
      const child = spawn('node', [path.join(__dirname, '..', 'index.js')], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let currentInputIndex = 0;
      let inputTimer;

      // Send inputs sequentially
      const sendNextInput = () => {
        if (currentInputIndex < config.inputs.length) {
          const input = config.inputs[currentInputIndex];
          child.stdin.write(input + '\n');
          currentInputIndex++;
          
          // Schedule next input
          inputTimer = setTimeout(sendNextInput, 100);
        }
      };

      child.stdout.on('data', (data) => {
        output += data.toString();
        
        // Start sending inputs after initial prompt
        if (!inputTimer && output.includes('Documentation site name:')) {
          setTimeout(sendNextInput, 100);
        }
      });

      child.stderr.on('data', (data) => {
        console.error(chalk.red(`Error: ${data}`));
      });

      child.on('close', (code) => {
        clearTimeout(inputTimer);
        
        const result = {
          name: config.name,
          exitCode: code,
          success: code === 0,
          output: output
        };

        // Validate output structure
        const validations = this.validateOutput(testPath, config);
        result.validations = validations;
        result.passed = result.success && validations.every(v => v.passed);

        this.results.push(result);
        resolve(result);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        child.kill();
        resolve({
          name: config.name,
          exitCode: -1,
          success: false,
          error: 'Timeout',
          passed: false
        });
      }, 30000);
    });
  }

  validateOutput(testPath, config) {
    const validations = [];
    const outputDir = path.join(testPath, 'mintlify-docs');

    // Check mint.json exists
    validations.push({
      test: 'mint.json exists',
      passed: fs.existsSync(path.join(outputDir, 'mint.json'))
    });

    // Validate mint.json structure
    try {
      const mintConfig = fs.readJsonSync(path.join(outputDir, 'mint.json'));
      
      validations.push({
        test: 'mint.json has name',
        passed: !!mintConfig.name
      });

      validations.push({
        test: 'mint.json has favicon',
        passed: !!mintConfig.favicon
      });

      validations.push({
        test: 'mint.json has navigation',
        passed: Array.isArray(mintConfig.navigation) && mintConfig.navigation.length > 0
      });

      // Check if versioning was configured
      if (config.name.includes('versioning')) {
        validations.push({
          test: 'versioning scripts exist',
          passed: fs.existsSync(path.join(outputDir, 'scripts', 'version-manager.sh'))
        });
      }

      // Check MDX files
      const mdxFiles = this.findFiles(outputDir, '.mdx');
      validations.push({
        test: 'MDX files created',
        passed: mdxFiles.length > 0
      });

    } catch (e) {
      validations.push({
        test: 'mint.json is valid JSON',
        passed: false,
        error: e.message
      });
    }

    return validations;
  }

  findFiles(dir, ext) {
    const files = [];
    
    function walk(currentDir) {
      try {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            walk(fullPath);
          } else if (stat.isFile() && item.endsWith(ext)) {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    walk(dir);
    return files;
  }

  printResults() {
    console.log(chalk.cyan('\n\n Test Results Summary'));
    console.log('═'.repeat(50));

    let passed = 0;
    let failed = 0;

    for (const result of this.results) {
      const status = result.passed ? chalk.green('✓ PASSED') : chalk.red('✗ FAILED');
      console.log(`\n${status} - ${result.name}`);
      
      if (result.validations) {
        for (const validation of result.validations) {
          const vStatus = validation.passed ? chalk.green('  ✓') : chalk.red('  ✗');
          console.log(`${vStatus} ${validation.test}`);
          if (validation.error) {
            console.log(chalk.gray(`    Error: ${validation.error}`));
          }
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

    console.log('\n' + '═'.repeat(50));
    console.log(chalk.cyan('Summary:'));
    console.log(chalk.green(`  Passed: ${passed}`));
    console.log(chalk.red(`  Failed: ${failed}`));
    console.log(chalk.blue(`  Total:  ${this.results.length}`));

    return failed === 0;
  }

  async cleanup() {
    // Optionally keep test outputs for inspection
    const keepOutputs = process.argv.includes('--keep');
    
    if (!keepOutputs) {
      console.log(chalk.gray('\n Cleaning up test outputs...'));
      await fs.remove(this.testDir);
    } else {
      console.log(chalk.gray(`\n Test outputs saved in: ${this.testDir}`));
    }
  }
}

// Main test execution
async function main() {
  console.log(chalk.cyan.bold(' Mintlifier End-to-End Test Suite\n'));
  
  const runner = new TestRunner();
  
  try {
    await runner.setup();
    
    // Run tests sequentially
    for (const config of testConfigs) {
      await runner.runTest(config);
    }
    
    // Print results
    const allPassed = runner.printResults();
    
    // Cleanup
    await runner.cleanup();
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error(chalk.red('\n Test suite failed:'), error);
    process.exit(1);
  }
}

// Run tests
main();