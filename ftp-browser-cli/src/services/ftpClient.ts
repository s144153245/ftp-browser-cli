import { Client, FileInfo as FTPFileInfo } from 'basic-ftp';
import { EventEmitter } from 'events';
import { Writable } from 'stream';
import { dirname, basename, join } from 'path';
import type {
  FTPConfig,
  FileItem,
  FileInfo,
  DownloadProgress,
  FTPEventType,
  FTPProgressCallback,
  FTPErrorCallback,
  IFTPService,
} from '../types/index.js';
import { defaults, errorMessages } from '../utils/constants.js';
import { ensureDirectoryExists, getFileSize } from './fileSystem.js';
import { FileParser } from './fileParser.js';
import {
  ConnectionError,
  AuthenticationError,
  FileNotFoundError,
  TimeoutError,
  DownloadError,
} from './errors.js';

/**
 * FTP Service Implementation
 * Handles all FTP operations including connection, listing, downloading, and searching
 */
export class FTPService extends EventEmitter implements IFTPService {
  private client: Client;
  private config: FTPConfig;
  private isConnected: boolean = false;
  private fileParser: FileParser;

  constructor(config: FTPConfig) {
    super();
    this.client = new Client(defaults.ftpTimeout);
    this.config = config;
    this.fileParser = new FileParser();
    this.client.ftp.verbose = false;

    // Note: basic-ftp uses passive mode by default, no configuration needed
  }

  /**
   * Connects to FTP server
   * @returns true if connection successful
   * @throws {ConnectionError} If connection fails
   * @throws {AuthenticationError} If authentication fails
   * @throws {TimeoutError} If connection times out
   */
  async connect(): Promise<boolean> {
    try {
      await this.client.access({
        host: this.config.host,
        port: this.config.port ?? defaults.ftpPort,
        user: this.config.user ?? defaults.ftpUser,
        password: this.config.password ?? defaults.ftpPassword,
        secure: this.config.secure ?? defaults.ftpSecure,
      });

      this.isConnected = true;
      this.emit('connected', { host: this.config.host, user: this.config.user });
      return true;
    } catch (error) {
      this.isConnected = false;

      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          throw new TimeoutError(errorMessages.timeout);
        }
        if (errorMessage.includes('login') || errorMessage.includes('auth') || errorMessage.includes('530')) {
          throw new AuthenticationError(errorMessages.login);
        }
        if (errorMessage.includes('resolve') || errorMessage.includes('dns')) {
          throw new ConnectionError(errorMessages.dnsResolve);
        }
        if (errorMessage.includes('connect') || errorMessage.includes('refused')) {
          throw new ConnectionError(errorMessages.connection);
        }
      }

      throw new ConnectionError(errorMessages.connection);
    }
  }

  /**
   * Disconnects from FTP server
   */
  async disconnect(): Promise<void> {
    try {
      this.client.close();
      this.isConnected = false;
      this.emit('disconnected');
    } catch (error) {
      // Ignore errors during disconnect
    }
  }

  /**
   * Lists files and directories at the specified path
   * @param path - Remote path to list
   * @returns Array of FileItem objects
   * @throws {ConnectionError} If not connected
   * @throws {FileNotFoundError} If path doesn't exist
   */
  async list(path: string): Promise<FileItem[]> {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected to FTP server');
    }

    try {
      const ftpFiles = await this.client.list(path);
      return this.parseFileList(ftpFiles);
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('not found') || errorMessage.includes('550')) {
          throw new FileNotFoundError(`${errorMessages.notFound}: ${path}`);
        }
      }
      throw error;
    }
  }

  /**
   * Parses FTP file list into FileItem array
   */
  private parseFileList(files: FTPFileInfo[]): FileItem[] {
    return files
      .filter(f => f.name !== '.' && f.name !== '..')
      .map(f => ({
        type: (f.isSymbolicLink ? 'LINK' : f.isDirectory ? 'DIR' : 'FILE') as FileItem['type'],
        name: f.name,
        size: f.size ?? null,
        date: f.modifiedAt ? f.modifiedAt.toISOString() : null,
        target: f.isSymbolicLink ? f.link : undefined,
        permissions: f.permissions ? this.formatPermissions(f.permissions, f.isDirectory, f.isSymbolicLink) : undefined,
      }))
      .sort((a, b) => {
        if (a.type === 'DIR' && b.type !== 'DIR') return -1;
        if (a.type !== 'DIR' && b.type === 'DIR') return 1;
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Formats permissions string
   */
  private formatPermissions(perms: { user: number; group: number; world: number }, isDir: boolean, isLink: boolean): string {
    const typeChar = isLink ? 'l' : isDir ? 'd' : '-';
    const formatRwx = (num: number): string => {
      return (num & 4 ? 'r' : '-') + (num & 2 ? 'w' : '-') + (num & 1 ? 'x' : '-');
    };
    return typeChar + formatRwx(perms.user) + formatRwx(perms.group) + formatRwx(perms.world);
  }

  /**
   * Downloads a single file
   * @param remotePath - Remote file path
   * @param localPath - Local file path
   * @param onProgress - Optional progress callback
   * @throws {ConnectionError} If not connected
   * @throws {FileNotFoundError} If file doesn't exist
   * @throws {DownloadError} If download fails
   */
  async download(
    remotePath: string,
    localPath: string,
    onProgress?: FTPProgressCallback
  ): Promise<void> {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected to FTP server');
    }

    try {
      // Ensure local directory exists
      await ensureDirectoryExists(dirname(localPath));

      // Get file size for progress tracking
      let totalSize = 0;
      try {
        totalSize = await this.client.size(remotePath);
      } catch {
        // Size command may not be supported, continue anyway
      }

      // Check for existing file to resume
      const existingSize = await getFileSize(localPath);
      const startOffset = existingSize > 0 && totalSize > existingSize ? existingSize : 0;

      const filename = basename(remotePath);
      let downloaded = startOffset;
      const startTime = Date.now();
      let lastProgressTime = startTime;

      // Track progress
      this.client.trackProgress((info) => {
        downloaded = startOffset + info.bytesOverall;
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;

        // Report progress every 100KB or 1 second, whichever comes first
        if (now - lastProgressTime >= 1000 || info.bytesOverall % (100 * 1024) === 0) {
          lastProgressTime = now;

          const speed = elapsed > 0 ? downloaded / elapsed : 0;
          const remaining = totalSize > 0 ? totalSize - downloaded : 0;
          const eta = speed > 0 && remaining > 0 ? remaining / speed : 0;

          if (onProgress) {
            onProgress({
              id: filename,
              filename,
              remotePath,
              localPath,
              totalSize,
              downloaded,
              speed,
              eta,
              status: 'downloading',
            });
          }

          this.emit('progress', {
            filename,
            remotePath,
            localPath,
            totalSize,
            downloaded,
            speed,
            eta,
            status: 'downloading',
          });
        }
      });

      try {
        if (startOffset > 0) {
          // Resume download
          await this.client.downloadTo(localPath, remotePath, startOffset);
        } else {
          // New download
          await this.client.downloadTo(localPath, remotePath);
        }

        // Final progress update
        if (onProgress) {
          onProgress({
            id: filename,
            filename,
            remotePath,
            localPath,
            totalSize: downloaded,
            downloaded,
            speed: 0,
            eta: 0,
            status: 'completed',
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('not found') || errorMessage.includes('550')) {
            throw new FileNotFoundError(`${errorMessages.notFound}: ${remotePath}`);
          }
        }
        throw new DownloadError(`${errorMessages.downloadFailed}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        this.client.trackProgress(() => {});
      }
    } catch (error) {
      if (error instanceof FileNotFoundError || error instanceof DownloadError) {
        throw error;
      }
      throw new DownloadError(`${errorMessages.downloadFailed}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Downloads a directory recursively
   * @param remotePath - Remote directory path
   * @param localPath - Local directory path
   * @param onProgress - Optional progress callback
   * @throws {ConnectionError} If not connected
   * @throws {FileNotFoundError} If directory doesn't exist
   * @throws {DownloadError} If download fails
   */
  async downloadDirectory(
    remotePath: string,
    localPath: string,
    onProgress?: FTPProgressCallback
  ): Promise<void> {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected to FTP server');
    }

    try {
      // Ensure local directory exists
      await ensureDirectoryExists(localPath);

      // List remote directory
      const files = await this.list(remotePath);

      for (const file of files) {
        const remoteFilePath = remotePath === '/' ? `/${file.name}` : `${remotePath}/${file.name}`;
        const localFilePath = join(localPath, file.name);

        if (file.type === 'DIR') {
          // Recursively download subdirectory
          await this.downloadDirectory(remoteFilePath, localFilePath, onProgress);
        } else if (file.type === 'FILE') {
          // Download file
          await this.download(remoteFilePath, localFilePath, onProgress);
        }
        // Skip symlinks for now (could follow them if needed)
      }
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      throw new DownloadError(`${errorMessages.downloadFailed}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets detailed file information
   * @param path - Remote file path
   * @returns FileInfo object
   * @throws {ConnectionError} If not connected
   * @throws {FileNotFoundError} If file doesn't exist
   */
  async getFileInfo(path: string): Promise<FileInfo> {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected to FTP server');
    }

    try {
      const files = await this.client.list(path);
      if (files.length === 0) {
        throw new FileNotFoundError(`${errorMessages.notFound}: ${path}`);
      }

      const file = files[0];
      return {
        path,
        type: (file.isSymbolicLink ? 'LINK' : file.isDirectory ? 'DIR' : 'FILE') as FileInfo['type'],
        size: file.size ?? null,
        date: file.modifiedAt ? file.modifiedAt.toISOString() : null,
        permissions: file.permissions ? this.formatPermissions(file.permissions, file.isDirectory, file.isSymbolicLink) : undefined,
        target: file.isSymbolicLink ? file.link : undefined,
      };
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('not found') || errorMessage.includes('550')) {
          throw new FileNotFoundError(`${errorMessages.notFound}: ${path}`);
        }
      }
      throw error;
    }
  }

  /**
   * Previews file content (text files only)
   * @param path - Remote file path
   * @param maxBytes - Maximum bytes to read (default: 10KB)
   * @returns File content as string
   * @throws {ConnectionError} If not connected
   * @throws {FileNotFoundError} If file doesn't exist
   */
  async preview(path: string, maxBytes?: number): Promise<string> {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected to FTP server');
    }

    const bytesToRead = maxBytes ?? defaults.maxPreviewBytes;

    try {
      // Download to buffer stream
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      const bufferStream = new Writable({
        write(chunk: Buffer, encoding, callback) {
          if (totalBytes < bytesToRead) {
            const remaining = bytesToRead - totalBytes;
            chunks.push(chunk.slice(0, remaining));
            totalBytes += Math.min(chunk.length, remaining);
          }
          callback();
        },
      });

      await this.client.downloadTo(bufferStream, path);
      const buffer = Buffer.concat(chunks);
      return buffer.toString('utf-8', 0, totalBytes);
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('not found') || errorMessage.includes('550')) {
          throw new FileNotFoundError(`${errorMessages.notFound}: ${path}`);
        }
      }
      throw error;
    }
  }

  /**
   * Searches for files matching pattern recursively
   * @param path - Starting path for search
   * @param pattern - Search pattern (case-insensitive)
   * @param maxDepth - Maximum search depth (default: 5)
   * @returns Array of matching FileItem objects
   * @throws {ConnectionError} If not connected
   */
  async search(path: string, pattern: string, maxDepth?: number): Promise<FileItem[]> {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected to FTP server');
    }

    const depthLimit = maxDepth ?? defaults.maxSearchDepth;
    const results: FileItem[] = [];
    const patternLower = pattern.toLowerCase();

    const searchRecursive = async (currentPath: string, depth: number): Promise<void> => {
      if (depth >= depthLimit) {
        return;
      }

      try {
        const files = await this.list(currentPath);

        for (const file of files) {
          const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;

          // Check if filename matches pattern
          if (file.name.toLowerCase().includes(patternLower)) {
            results.push(file);
          }

          // Recursively search subdirectories
          if (file.type === 'DIR') {
            await searchRecursive(fullPath, depth + 1);
          }
        }
      } catch (error) {
        // Log error but continue searching other directories
        // Don't throw to allow search to continue
      }
    };

    await searchRecursive(path, 0);
    return results;
  }

  /**
   * Registers event listener
   * @param event - Event type
   * @param callback - Callback function
   */
  on(event: FTPEventType, callback: FTPProgressCallback | FTPErrorCallback): this {
    super.on(event, callback);
    return this;
  }

  /**
   * Removes event listener
   * @param event - Event type
   * @param callback - Callback function
   */
  off(event: FTPEventType, callback: FTPProgressCallback | FTPErrorCallback): this {
    super.off(event, callback);
    return this;
  }
}

/**
 * Creates a new FTPService instance
 * @param config - FTP configuration (partial, will be merged with defaults)
 * @returns FTPService instance
 */
export function createFTPService(config: Partial<FTPConfig>): FTPService {
  const defaultConfig: FTPConfig = {
    host: 'localhost',
    port: defaults.ftpPort,
    user: defaults.ftpUser,
    password: defaults.ftpPassword,
    secure: defaults.ftpSecure,
    timeout: defaults.ftpTimeout,
    passive: defaults.ftpPassive,
  };
  return new FTPService({ ...defaultConfig, ...config });
}
