#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { freezeVersion } from '../../scripts/version-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script to set up versioning for Mintlifier's own documentation
console.log('Setting up versioning for Mintlifier documentation...\n');
console.log('This script will:');
console.log('1. Set up versioning for the existing docs');
console.log('2. Create a working version directory (next/main/latest/current)');
console.log('3. Update navigation to support versions\n');

// Change to docs directory
process.chdir(path.join(__dirname, '..'));

// Run the version manager
freezeVersion().catch(error => {
  console.error('Error setting up versioning:', error);
  process.exit(1);
});