import { promises as fs } from 'fs';
import { dirname } from 'path';
import { InvalidPathError, PermissionError } from './errors.js';

/**
 * Ensures directory exists, creating it if necessary
 * @param path - Directory path to ensure exists
 * @throws {PermissionError} If directory cannot be created due to permissions
 * @throws {InvalidPathError} If path is invalid
 */
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

/**
 * Checks if file exists
 * @param path - File path to check
 * @returns true if file exists, false otherwise
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets file size in bytes
 * @param path - File path
 * @returns File size in bytes, or 0 if file doesn't exist
 * @throws {PermissionError} If file cannot be accessed
 */
export async function getFileSize(path: string): Promise<number> {
  try {
    const stats = await fs.stat(path);
    return stats.size;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('EACCES')) {
        throw new PermissionError(`Cannot access file: ${error.message}`);
      }
    }
    return 0;
  }
}

/**
 * Writes data to file
 * @param path - File path to write to
 * @param data - Data buffer to write
 * @param append - If true, append to file; otherwise overwrite
 * @throws {PermissionError} If file cannot be written
 * @throws {InvalidPathError} If path is invalid
 */
export async function writeFile(
  path: string,
  data: Buffer,
  append: boolean = false
): Promise<void> {
  try {
    // Ensure directory exists before writing
    const dir = dirname(path);
    await ensureDirectoryExists(dir);

    if (append) {
      await fs.appendFile(path, data);
    } else {
      await fs.writeFile(path, data);
    }
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

/**
 * Reads file content
 * @param path - File path to read
 * @param maxBytes - Maximum bytes to read (optional)
 * @returns File content as Buffer
 * @throws {FileNotFoundError} If file doesn't exist
 * @throws {PermissionError} If file cannot be read
 */
export async function readFile(path: string, maxBytes?: number): Promise<Buffer> {
  try {
    if (maxBytes) {
      const handle = await fs.open(path, 'r');
      try {
        const buffer = Buffer.alloc(maxBytes);
        const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
        return buffer.slice(0, bytesRead);
      } finally {
        await handle.close();
      }
    } else {
      return await fs.readFile(path);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        const { FileNotFoundError } = await import('./errors.js');
        throw new FileNotFoundError(`File not found: ${path}`);
      }
      if (error.message.includes('permission') || error.message.includes('EACCES')) {
        throw new PermissionError(`Cannot read file: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * Removes file
 * @param path - File path to remove
 * @throws {PermissionError} If file cannot be removed
 */
export async function removeFile(path: string): Promise<void> {
  try {
    await fs.unlink(path);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('EACCES')) {
        throw new PermissionError(`Cannot remove file: ${error.message}`);
      }
    }
    throw error;
  }
}
