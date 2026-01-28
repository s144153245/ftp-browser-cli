/**
 * File system helpers for download directory and local files.
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import { InvalidPathError, PermissionError } from './errors.js';

export async function ensureDirectoryExists(path: string): Promise<void> {
  try {
    await fs.mkdir(path, { recursive: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('EACCES')) {
        throw new PermissionError(`Cannot create directory: ${error.message}`);
      }
      if (error.message.includes('ENOENT') || error.message.includes('invalid')) {
        throw new InvalidPathError(`Invalid path: ${path}`);
      }
    }
    throw error;
  }
}

export async function getFileSize(path: string): Promise<number> {
  try {
    const stats = await fs.stat(path);
    return stats.size;
  } catch {
    return 0;
  }
}

export async function writeFile(
  path: string,
  data: Buffer,
  append: boolean = false
): Promise<void> {
  try {
    await ensureDirectoryExists(dirname(path));
    if (append) await fs.appendFile(path, data);
    else await fs.writeFile(path, data);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('EACCES')) {
        throw new PermissionError(`Cannot write file: ${error.message}`);
      }
      if (error.message.includes('ENOENT') || error.message.includes('invalid')) {
        throw new InvalidPathError(`Invalid path: ${path}`);
      }
    }
    throw error;
  }
}
