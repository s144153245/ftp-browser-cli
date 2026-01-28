import { paths } from './constants.js';

/**
 * Normalizes FTP paths.
 * Removes trailing slashes, resolves '..' and '.', ensures leading slash.
 * @param path - Path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  if (!path || path === '') {
    return paths.root;
  }
  
  // Remove trailing slashes
  let normalized = path.replace(/\/+$/, '');
  
  // Ensure leading slash
  if (!normalized.startsWith(paths.separator)) {
    normalized = paths.separator + normalized;
  }
  
  // Split into segments and resolve '..' and '.'
  const segments = normalized.split(paths.separator).filter(segment => segment !== '');
  const resolved: string[] = [];
  
  for (const segment of segments) {
    if (segment === paths.current) {
      // Skip '.'
      continue;
    } else if (segment === paths.parent) {
      // Go up one level
      if (resolved.length > 0) {
        resolved.pop();
      }
    } else {
      resolved.push(segment);
    }
  }
  
  // Reconstruct path
  return paths.separator + resolved.join(paths.separator);
}

/**
 * Joins path segments.
 * @param paths - Path segments to join
 * @returns Joined path
 */
export function joinPath(...pathSegments: string[]): string {
  if (pathSegments.length === 0) {
    return paths.root;
  }
  
  // Filter out empty segments
  const segments = pathSegments.filter(segment => segment && segment !== '');
  
  if (segments.length === 0) {
    return paths.root;
  }
  
  // Join segments
  let joined = segments.join(paths.separator);
  
  // Ensure leading slash
  if (!joined.startsWith(paths.separator)) {
    joined = paths.separator + joined;
  }
  
  // Normalize the result
  return normalizePath(joined);
}

/**
 * Gets parent directory path.
 * @param path - Current path
 * @returns Parent directory path
 */
export function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  
  if (normalized === paths.root) {
    return paths.root; // Root has no parent
  }
  
  const segments = normalized.split(paths.separator).filter(segment => segment !== '');
  
  if (segments.length <= 1) {
    return paths.root;
  }
  
  // Remove last segment
  segments.pop();
  
  return paths.separator + segments.join(paths.separator);
}

/**
 * Extracts filename from path.
 * @param path - Full path
 * @returns Filename
 */
export function getFileName(path: string): string {
  const normalized = normalizePath(path);
  
  if (normalized === paths.root) {
    return paths.root;
  }
  
  const segments = normalized.split(paths.separator).filter(segment => segment !== '');
  
  if (segments.length === 0) {
    return paths.root;
  }
  
  return segments[segments.length - 1];
}
