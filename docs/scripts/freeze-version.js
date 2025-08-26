#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { freezeVersion } from '../../scripts/version-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script to freeze a version of Mintlifier's documentation
console.log('Freezing documentation version...\n');

// Change to docs directory
process.chdir(path.join(__dirname, '..'));

// Run the version manager
freezeVersion().catch(error => {
  console.error('Error freezing version:', error);
  process.exit(1);
});