import { lstat } from 'node:fs/promises';
import path from 'node:path';

export function normalizeProjectRelativePath(value, label = 'path') {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid ${label}: expected a non-empty path`);
  }
  if (value.includes('\0')) throw new Error(`Invalid ${label}: null bytes are not allowed`);

  const portable = value.replaceAll('\\', '/');
  if (/^[A-Za-z]:\//.test(portable) || portable.startsWith('//')) {
    throw new Error(`Invalid ${label}: absolute filesystem paths are not allowed`);
  }

  const segments = portable.replace(/^\/+/, '').split('/');
  if (segments.includes('..')) {
    throw new Error(`Invalid ${label}: parent directory traversal is not allowed`);
  }

  const normalized = segments.filter((segment) => segment && segment !== '.').join('/');
  if (!normalized) throw new Error(`Invalid ${label}: expected a file path`);
  return normalized;
}

export function resolveWithin(baseDir, value, label = 'path') {
  const relativePath = normalizeProjectRelativePath(value, label);
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, relativePath);
  const relative = path.relative(base, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid ${label}: path escapes the project directory`);
  }
  return resolved;
}

export async function resolveWithinWithoutSymlinks(baseDir, value, label = 'path') {
  const base = path.resolve(baseDir);
  const resolved = resolveWithin(base, value, label);
  const segments = path.relative(base, resolved).split(path.sep).filter(Boolean);
  let current = base;

  for (const segment of segments) {
    current = path.join(current, segment);
    try {
      const stats = await lstat(current);
      if (stats.isSymbolicLink()) {
        throw new Error(`Invalid ${label}: symbolic links are not allowed in project paths`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') break;
      throw error;
    }
  }

  return resolved;
}
