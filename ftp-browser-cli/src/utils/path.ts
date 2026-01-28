/**
 * Path utilities for FTP and local paths.
 */

import { paths } from './constants.js';

export function normalizePath(path: string): string {
  if (!path || path === '') return paths.root;
  let normalized = path.replace(/\/+$/, '');
  if (!normalized.startsWith(paths.separator)) {
    normalized = paths.separator + normalized;
  }
  const segments = normalized.split(paths.separator).filter((s) => s !== '');
  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === paths.current) continue;
    if (segment === paths.parent) {
      if (resolved.length > 0) resolved.pop();
    } else {
      resolved.push(segment);
    }
  }
  return paths.separator + resolved.join(paths.separator);
}

export function joinPath(...pathSegments: string[]): string {
  if (pathSegments.length === 0) return paths.root;
  const segments = pathSegments.filter((s) => s && s !== '');
  if (segments.length === 0) return paths.root;
  let joined = segments.join(paths.separator);
  if (!joined.startsWith(paths.separator)) joined = paths.separator + joined;
  return normalizePath(joined);
}

export function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === paths.root) return paths.root;
  const segments = normalized.split(paths.separator).filter((s) => s !== '');
  if (segments.length <= 1) return paths.root;
  segments.pop();
  return paths.separator + segments.join(paths.separator);
}
