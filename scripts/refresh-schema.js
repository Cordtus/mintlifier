#!/usr/bin/env node

import { fileURLToPath } from 'node:url';

import fs from 'fs-extra';

import { CURRENT_MINTLIFY_SCHEMA_URL } from '../lib/current-mintlify.js';

const response = await fetch(CURRENT_MINTLIFY_SCHEMA_URL);
if (!response.ok) {
  throw new Error(`Schema download failed: ${response.status} ${response.statusText}`);
}

const schema = await response.json();
const outputPath = fileURLToPath(new URL('../docs-json-schema.json', import.meta.url));
await fs.writeJson(outputPath, schema, { spaces: 2 });
console.log(`Updated docs-json-schema.json from ${CURRENT_MINTLIFY_SCHEMA_URL}`);
