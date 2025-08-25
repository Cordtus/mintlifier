#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const action = process.argv[2];
const version = process.argv[3];

if (!action || !version) {
  console.error('Usage: node update-versions.js [add|remove] VERSION');
  process.exit(1);
}

const versionsPath = path.join(__dirname, '..', 'versions.json');

// Create versions.json if it doesn't exist
if (!fs.existsSync(versionsPath)) {
  fs.writeFileSync(versionsPath, JSON.stringify({
    versions: [],
    defaultVersion: null,
    currentVersion: null,
    latestLabel: 'latest',
    showLatest: true
  }, null, 2));
}

const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));

// Function to parse semantic version
function parseVersion(v) {
  const match = v.match(/v?(\d+)\.(\d+)\.(\d+)(.*)/);
  if (!match) return [0, 0, 0, ''];
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4]];
}

// Function to sort versions
function sortVersions(versions) {
  return versions.sort((a, b) => {
    // Handle special labels
    const specialOrder = { 'latest': -3, 'next': -2, 'main': -1 };
    if (specialOrder[a] !== undefined) return specialOrder[a];
    if (specialOrder[b] !== undefined) return -specialOrder[b];
    
    const [aMajor, aMinor, aPatch, aPre] = parseVersion(a);
    const [bMajor, bMinor, bPatch, bPre] = parseVersion(b);
    
    // Compare versions (newest first)
    if (bMajor !== aMajor) return bMajor - aMajor;
    if (bMinor !== aMinor) return bMinor - aMinor;
    if (bPatch !== aPatch) return bPatch - aPatch;
    
    // Handle pre-release versions
    if (!aPre && bPre) return -1;
    if (aPre && !bPre) return 1;
    return bPre.localeCompare(aPre);
  });
}

switch (action) {
  case 'add':
    // Add new version
    if (!versions.versions.includes(version)) {
      versions.versions.push(version);
      
      // Sort versions properly
      versions.versions = sortVersions(versions.versions);
      
      // Update default version to the new version (if not a pre-release)
      if (!version.includes('-')) {
        versions.defaultVersion = version;
      }
      versions.currentVersion = version;

      console.log(` ✓ Added version ${version}`);
    } else {
      console.log(`  Version ${version} already exists`);
    }
    break;

  case 'remove':
    const index = versions.versions.indexOf(version);
    if (index > -1) {
      versions.versions.splice(index, 1);
      console.log(` ✓ Removed version ${version}`);

      // Update default if removed version was default
      if (versions.defaultVersion === version) {
        // Set to first non-special version, or latest if no other versions
        const regularVersions = versions.versions.filter(v => 
          v !== 'latest' && v !== 'next' && v !== 'main'
        );
        versions.defaultVersion = regularVersions[0] || versions.latestLabel || 'latest';
        console.log(` ℹ Updated default version to ${versions.defaultVersion}`);
      }
      
      // Update current version if needed
      if (versions.currentVersion === version) {
        versions.currentVersion = null;
      }
    } else {
      console.log(`  Version ${version} not found`);
    }
    break;

  default:
    console.error('Invalid action. Use: add or remove');
    process.exit(1);
}

// Write updated versions.json
fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2) + '\n');
console.log(' ✓ Updated versions.json');
