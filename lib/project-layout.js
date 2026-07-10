import path from 'node:path';

import fs from 'fs-extra';

export async function resolveProjectLayout({ cwd = process.cwd(), configPath } = {}) {
  const base = path.resolve(cwd);
  const candidates = configPath
    ? [path.resolve(base, configPath)]
    : [path.join(base, 'docs.json'), path.join(base, 'docs', 'docs.json')];

  let resolvedConfig = null;
  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      resolvedConfig = candidate;
      break;
    }
  }

  if (!resolvedConfig) {
    throw new Error(`No docs.json found under ${base}`);
  }

  const configDir = path.dirname(resolvedConfig);
  const nestedDocsConfig = path.basename(configDir) === 'docs';
  const projectRoot = nestedDocsConfig ? path.dirname(configDir) : configDir;
  const contentRoot = nestedDocsConfig ? configDir : path.join(projectRoot, 'docs');

  return {
    projectRoot,
    configPath: resolvedConfig,
    configDir,
    contentRoot,
    versionsPath: path.join(contentRoot, 'versions.json')
  };
}
