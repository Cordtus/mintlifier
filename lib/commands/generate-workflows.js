#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { confirm, select, input } from '@inquirer/prompts';

/**
 * Generate GitHub Actions workflow for automated versioning
 */
function generateGitHubActionsWorkflow(config = {}) {
  const {
    workflowName = 'Auto Freeze Documentation Version',
    triggerRepo = '',
    eventType = 'docs-version-freeze',
    nodeVersion = '18'
  } = config;

  return `name: ${workflowName}

on:
  # Trigger from external repository releases
  repository_dispatch:
    types: [${eventType}]
  
  # Manual trigger
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to freeze (e.g., v1.0.0)'
        required: true
        type: string
      new_dev_version:
        description: 'New development version (e.g., v1.1.0)'
        required: true
        type: string

jobs:
  freeze-version:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: \${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'

      - name: Extract version information
        id: version-info
        run: |
          # Get version from either repository_dispatch or workflow_dispatch
          if [[ "\${{ github.event_name }}" == "repository_dispatch" ]]; then
            VERSION="\${{ github.event.client_payload.version }}"
            NEW_DEV_VERSION="\${{ github.event.client_payload.new_dev_version }}"
          else
            VERSION="\${{ github.event.inputs.version }}"
            NEW_DEV_VERSION="\${{ github.event.inputs.new_dev_version }}"
          fi

          echo "version=\$VERSION" >> \$GITHUB_OUTPUT
          echo "new_dev_version=\$NEW_DEV_VERSION" >> \$GITHUB_OUTPUT
          
          echo "Freezing version: \$VERSION"
          echo "Next development version: \$NEW_DEV_VERSION"

      - name: Install dependencies
        run: npm ci
        if: \${{ hashFiles('package-lock.json') != '' }}

      - name: Run automated version freeze
        env:
          CURRENT_VERSION: \${{ steps.version-info.outputs.version }}
          NEW_VERSION: \${{ steps.version-info.outputs.new_dev_version }}
        run: |
          # Run the automated version freeze
          npx mintlifier freeze --automated --version=\$CURRENT_VERSION --next=\$NEW_VERSION

      - name: Commit changes and create PR
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"

          # Stage all changes
          git add -A

          if git diff --staged --quiet; then
            echo "No changes to commit"
            exit 0
          fi

          # Create commit
          git commit -m "docs: freeze \${{ steps.version-info.outputs.version }} and begin \${{ steps.version-info.outputs.new_dev_version }} development

          Automated version freeze${triggerRepo ? ` triggered by ${triggerRepo}` : ''}
          
          Changes:
          - Frozen documentation snapshot at \${{ steps.version-info.outputs.version }}/
          - Updated navigation structure
          - Prepared \${{ steps.version-info.outputs.new_dev_version }} development version"

          # Create a new branch for the PR
          BRANCH_NAME="auto-freeze-\${{ steps.version-info.outputs.version }}"
          git checkout -b "\$BRANCH_NAME"
          git push origin "\$BRANCH_NAME"

          # Create pull request using GitHub CLI
          gh pr create \\
            --title "Freeze documentation for \${{ steps.version-info.outputs.version }}" \\
            --body "Automated version freeze${triggerRepo ? ` triggered by ${triggerRepo}` : ''} release \\\`\${{ steps.version-info.outputs.version }}\\\`.

          ## Changes Made

          - ✅ **Documentation Frozen**: Complete snapshot at \\\`\${{ steps.version-info.outputs.version }}/\\\`
          - ✅ **Navigation Updated**: Added new version to docs.json navigation
          - ✅ **Links Updated**: Internal links updated in frozen version
          - ✅ **Next Version**: Prepared \\\`\${{ steps.version-info.outputs.new_dev_version }}\\\` development

          ## Review Checklist

          - [ ] Verify frozen documentation renders correctly
          - [ ] Check navigation includes new version
          - [ ] Test version switching works properly
          - [ ] Confirm development version is ready for next changes

          This PR can be merged once review is complete." \\
            --head "\$BRANCH_NAME" \\
            --base main
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
}

/**
 * Generate workflow for triggering external repos
 */
function generateTriggerWorkflow(config = {}) {
  const {
    targetRepo = '',
    eventType = 'docs-version-freeze'
  } = config;

  return `name: Trigger Documentation Freeze

on:
  release:
    types: [published]

jobs:
  trigger-docs-freeze:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger documentation repository
        run: |
          curl -X POST \\
            -H "Accept: application/vnd.github.v3+json" \\
            -H "Authorization: token \${{ secrets.DOCS_REPO_TOKEN }}" \\
            https://api.github.com/repos/${targetRepo}/dispatches \\
            -d '{
              "event_type": "${eventType}",
              "client_payload": {
                "version": "\${{ github.event.release.tag_name }}",
                "new_dev_version": "v\${{ github.event.release.tag_name | sed 's/v//; s/\\.\\([0-9]*\\)\\./\\.\$((\$1+1))\\./' }}"
              }
            }'
`;
}

export default async function runGenerateWorkflows(args) {
  console.log(chalk.cyan('\n⚙️  Generate Automation Workflows\n'));
  
  const workflowType = await select({
    message: 'What type of workflow would you like to generate?',
    choices: [
      { name: 'Auto-freeze workflow (for docs repo)', value: 'auto-freeze' },
      { name: 'Trigger workflow (for source repo)', value: 'trigger' },
      { name: 'Both workflows', value: 'both' }
    ]
  });
  
  let config = {};
  
  if (workflowType === 'auto-freeze' || workflowType === 'both') {
    console.log(chalk.yellow('\n📋 Auto-freeze Workflow Configuration:'));
    
    config.triggerRepo = await input({
      message: 'Source repository (owner/repo) that will trigger freezes (optional):',
      default: ''
    });
    
    config.eventType = await input({
      message: 'Repository dispatch event type:',
      default: 'docs-version-freeze'
    });
    
    config.nodeVersion = await input({
      message: 'Node.js version:',
      default: '18'
    });
  }
  
  let triggerConfig = {};
  
  if (workflowType === 'trigger' || workflowType === 'both') {
    console.log(chalk.yellow('\n📋 Trigger Workflow Configuration:'));
    
    triggerConfig.targetRepo = await input({
      message: 'Target documentation repository (owner/repo):',
      validate: (value) => value.trim() ? true : 'Target repository is required'
    });
    
    triggerConfig.eventType = config.eventType || await input({
      message: 'Repository dispatch event type:',
      default: 'docs-version-freeze'
    });
  }
  
  // Create .github/workflows directory
  const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
  await fs.ensureDir(workflowsDir);
  
  let createdFiles = [];
  
  // Generate auto-freeze workflow
  if (workflowType === 'auto-freeze' || workflowType === 'both') {
    const workflowPath = path.join(workflowsDir, 'auto-freeze-version.yml');
    const workflowContent = generateGitHubActionsWorkflow(config);
    
    await fs.writeFile(workflowPath, workflowContent);
    createdFiles.push(path.relative(process.cwd(), workflowPath));
    console.log(chalk.green(`✓ Created ${createdFiles[createdFiles.length - 1]}`));
  }
  
  // Generate trigger workflow
  if (workflowType === 'trigger' || workflowType === 'both') {
    const triggerPath = path.join(workflowsDir, 'trigger-docs-freeze.yml');
    const triggerContent = generateTriggerWorkflow(triggerConfig);
    
    await fs.writeFile(triggerPath, triggerContent);
    createdFiles.push(path.relative(process.cwd(), triggerPath));
    console.log(chalk.green(`✓ Created ${createdFiles[createdFiles.length - 1]}`));
  }
  
  console.log(chalk.green('\n✅ Workflow generation complete!'));
  
  if (workflowType === 'auto-freeze' || workflowType === 'both') {
    console.log(chalk.cyan('\n📋 Auto-freeze Workflow Setup:'));
    console.log('  1. The workflow will be triggered by repository_dispatch events');
    console.log('  2. It can also be triggered manually from the Actions tab');
    console.log('  3. It will create a PR with the frozen version');
    
    if (config.triggerRepo) {
      console.log(chalk.yellow('\\n⚠️  External Repository Setup:'));
      console.log(`  1. Add DOCS_REPO_TOKEN secret to ${config.triggerRepo}`);
      console.log('  2. Token needs "repo" and "workflow" permissions');
      console.log('  3. Create trigger workflow in the source repository');
    }
  }
  
  if (workflowType === 'trigger' || workflowType === 'both') {
    console.log(chalk.cyan('\\n📋 Trigger Workflow Setup:'));
    console.log(`  1. Add DOCS_REPO_TOKEN secret with permissions to trigger ${triggerConfig.targetRepo}`);
    console.log('  2. Token needs "repo" and "workflow" permissions');
    console.log('  3. Workflow will trigger on release publish events');
  }
  
  console.log(chalk.gray('\\n💡 Test the workflows:'));
  console.log('  • Manual trigger: Go to Actions tab → Select workflow → Run workflow');
  console.log('  • Repository dispatch: Create a release or use the API');
  
  return createdFiles;
}

export { generateGitHubActionsWorkflow, generateTriggerWorkflow };