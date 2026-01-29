/**
 * FTP client service using basic-ftp.
 */

import { Client, type FileInfo as FTPFileInfo } from 'basic-ftp';
import { EventEmitter } from 'events';
import { Writable } from 'stream';
import { dirname, join } from 'path';
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
import {
  ConnectionError,
  AuthenticationError,
  FileNotFoundError,
  TimeoutError,
  DownloadError,
} from './errors.js';

function formatPermissions(
  p: { user: number; group: number; world: number },
  isDir: boolean,
  isLink: boolean
): string {
  const tc = isLink ? 'l' : isDir ? 'd' : '-';
  const rwx = (n: number) =>
    (n & 4 ? 'r' : '-') + (n & 2 ? 'w' : '-') + (n & 1 ? 'x' : '-');
  return tc + rwx(p.user) + rwx(p.group) + rwx(p.world);
}

function toFileItem(f: FTPFileInfo): FileItem {
  return {
    type: (f.isSymbolicLink ? 'LINK' : f.isDirectory ? 'DIR' : 'FILE') as FileItem['type'],
    name: f.name,
    size: f.size ?? null,
    date: f.modifiedAt ? f.modifiedAt.toISOString() : (f.rawModifiedAt || null),
    target: f.isSymbolicLink ? f.link : undefined,
    permissions: f.permissions
      ? formatPermissions(f.permissions, f.isDirectory, f.isSymbolicLink)
      : undefined,
  };
}

export class FTPService extends EventEmitter implements IFTPService {
  private client: Client;
  private cfg: FTPConfig;
  private isConnected = false;

  constructor(config: FTPConfig) {
    super();
    this.client = new Client(config.timeout ?? defaults.ftpTimeout);
    this.cfg = config;
    this.client.ftp.verbose = false;
  }

  /** Expose config so download clients can reuse connection details */
  get config(): FTPConfig {
    return this.cfg;
  }

  /** Create a separate FTP client for download operations */
  async createDownloadClient(): Promise<Client> {
    const dlClient = new Client(this.cfg.timeout ?? defaults.ftpTimeout);
    dlClient.ftp.verbose = false;
    await dlClient.access({
      host: this.cfg.host,
      port: this.cfg.port ?? defaults.ftpPort,
      user: this.cfg.user ?? defaults.ftpUser,
      password: this.cfg.password ?? defaults.ftpPassword,
      secure: this.cfg.secure ?? defaults.ftpSecure,
    });
    return dlClient;
  }

  /** Attempt to reconnect the browsing client if connection was lost */
  private async ensureConnected(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.client.pwd();
        return;
      } catch {
        // connection lost, try reconnect
      }
    }
    try {
      this.client.close();
    } catch { /* ignore */ }
    this.client = new Client(this.cfg.timeout ?? defaults.ftpTimeout);
    this.client.ftp.verbose = false;
    await this.client.access({
      host: this.cfg.host,
      port: this.cfg.port ?? defaults.ftpPort,
      user: this.cfg.user ?? defaults.ftpUser,
      password: this.cfg.password ?? defaults.ftpPassword,
      secure: this.cfg.secure ?? defaults.ftpSecure,
    });
    this.isConnected = true;
  }

  async connect(): Promise<boolean> {
    try {
      await this.client.access({
        host: this.cfg.host,
        port: this.cfg.port ?? defaults.ftpPort,
        user: this.cfg.user ?? defaults.ftpUser,
        password: this.cfg.password ?? defaults.ftpPassword,
        secure: this.cfg.secure ?? defaults.ftpSecure,
      });
      this.isConnected = true;
      this.emit('connected', { host: this.cfg.host, user: this.cfg.user });
      return true;
    } catch (err) {
      this.isConnected = false;
      if (err instanceof Error) {
        const m = err.message.toLowerCase();
        if (m.includes('timeout') || m.includes('timed out'))
          throw new TimeoutError(errorMessages.timeout);
        if (m.includes('login') || m.includes('auth') || m.includes('530'))
          throw new AuthenticationError(errorMessages.login);
        if (m.includes('resolve') || m.includes('dns'))
          throw new ConnectionError(errorMessages.dnsResolve);
        if (m.includes('connect') || m.includes('refused'))
          throw new ConnectionError(errorMessages.connection);
      }
      throw new ConnectionError(errorMessages.connection);
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.client.close();
      this.isConnected = false;
      this.emit('disconnected');
    } catch {
      /* ignore */
    }
  }

  async list(path: string): Promise<FileItem[]> {
    await this.ensureConnected();
    try {
      const raw = await this.client.list(path);
      return raw
        .filter((f) => f.name !== '.' && f.name !== '..')
        .map(toFileItem)
        .sort((a, b) => {
          if (a.type === 'DIR' && b.type !== 'DIR') return -1;
          if (a.type !== 'DIR' && b.type === 'DIR') return 1;
          return a.name.localeCompare(b.name);
        });
    } catch (err) {
      if (err instanceof Error && (err.message.includes('not found') || err.message.includes('550')))
        throw new FileNotFoundError(`${errorMessages.notFound}: ${path}`);
      throw err;
    }
  }

  async download(
    remotePath: string,
    localPath: string,
    onProgress?: FTPProgressCallback
  ): Promise<void> {
    if (!this.isConnected) throw new ConnectionError('Not connected to FTP server');
    await ensureDirectoryExists(dirname(localPath));
    let totalSize = 0;
    try {
      totalSize = await this.client.size(remotePath);
    } catch {
      /* size not supported */
    }
    const existingSize = await getFileSize(localPath);
    const startOffset =
      existingSize > 0 && totalSize > 0 && totalSize > existingSize ? existingSize : 0;
    const filename = remotePath.split('/').filter(Boolean).pop() ?? remotePath;
    let downloaded = startOffset;
    const startTime = Date.now();
    let lastEmit = startTime;

    this.client.trackProgress((info) => {
      downloaded = startOffset + info.bytesOverall;
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      if (now - lastEmit < 200) return;
      lastEmit = now;
      const speed = elapsed > 0 ? downloaded / elapsed : 0;
      const remaining = totalSize > 0 ? totalSize - downloaded : 0;
      const eta = speed > 0 && remaining > 0 ? remaining / speed : 0;
      const p: DownloadProgress = {
        id: filename,
        filename,
        remotePath,
        localPath,
        totalSize,
        downloaded,
        speed,
        eta,
        status: 'downloading',
      };
      onProgress?.(p);
      this.emit('progress', p);
    });

    try {
      if (startOffset > 0) {
        await this.client.downloadTo(localPath, remotePath, startOffset);
      } else {
        await this.client.downloadTo(localPath, remotePath);
      }
      const done: DownloadProgress = {
        id: filename,
        filename,
        remotePath,
        localPath,
        totalSize: downloaded,
        downloaded,
        speed: 0,
        eta: 0,
        status: 'completed',
      };
      onProgress?.(done);
      this.emit('progress', done);
    } catch (err) {
      this.client.trackProgress(() => {});
      if (err instanceof Error && (err.message.includes('not found') || err.message.includes('550')))
        throw new FileNotFoundError(`${errorMessages.notFound}: ${remotePath}`);
      throw new DownloadError(
        `${errorMessages.downloadFailed}: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
    this.client.trackProgress(() => {});
  }

  async downloadDirectory(
    remotePath: string,
    localPath: string,
    onProgress?: FTPProgressCallback
  ): Promise<void> {
    if (!this.isConnected) throw new ConnectionError('Not connected to FTP server');
    await ensureDirectoryExists(localPath);
    const files = await this.list(remotePath);
    for (const file of files) {
      const r = remotePath === '/' ? `/${file.name}` : `${remotePath}/${file.name}`;
      const l = join(localPath, file.name);
      if (file.type === 'DIR') {
        await this.downloadDirectory(r, l, onProgress);
      } else if (file.type === 'FILE') {
        await this.download(r, l, onProgress);
      }
    }
  }

  async getFileInfo(path: string): Promise<FileInfo> {
    await this.ensureConnected();
    try {
      const raw = await this.client.list(path);
      if (raw.length === 0) throw new FileNotFoundError(`${errorMessages.notFound}: ${path}`);
      const f = raw[0];
      return {
        path,
        type: (f.isSymbolicLink ? 'LINK' : f.isDirectory ? 'DIR' : 'FILE') as FileInfo['type'],
        size: f.size ?? null,
        date: f.modifiedAt ? f.modifiedAt.toISOString() : (f.rawModifiedAt || null),
        permissions: f.permissions
          ? formatPermissions(f.permissions, f.isDirectory, f.isSymbolicLink)
          : undefined,
        target: f.isSymbolicLink ? f.link : undefined,
      };
    } catch (err) {
      if (err instanceof FileNotFoundError) throw err;
      if (err instanceof Error && (err.message.includes('not found') || err.message.includes('550')))
        throw new FileNotFoundError(`${errorMessages.notFound}: ${path}`);
      throw err;
    }
  }

  async preview(path: string, maxBytes?: number): Promise<string> {
    await this.ensureConnected();
    const limit = maxBytes ?? defaults.maxPreviewBytes;
    const chunks: Buffer[] = [];
    let total = 0;
    const buf = new Writable({
      write(chunk: Buffer, _enc, cb) {
        if (total < limit) {
          const rem = limit - total;
          chunks.push(chunk.subarray(0, rem));
          total += Math.min(chunk.length, rem);
        }
        cb();
      },
    });
    try {
      await this.client.downloadTo(buf, path);
      return Buffer.concat(chunks).toString('utf-8', 0, total);
    } catch (err) {
      if (err instanceof Error && (err.message.includes('not found') || err.message.includes('550')))
        throw new FileNotFoundError(`${errorMessages.notFound}: ${path}`);
      throw err;
    }
  }

  async search(path: string, pattern: string, maxDepth?: number, onMatch?: (item: FileItem) => void): Promise<FileItem[]> {
    await this.ensureConnected();
    const depthLimit = maxDepth ?? defaults.maxSearchDepth;
    const results: FileItem[] = [];
    const pat = pattern.toLowerCase();

    const recurse = async (cur: string, depth: number): Promise<void> => {
      if (depth >= depthLimit) return;
      try {
        const items = await this.list(cur);
        for (const file of items) {
          const full = cur === '/' ? `/${file.name}` : `${cur}/${file.name}`;
          if (file.name.toLowerCase().includes(pat)) {
            const matched = { ...file, path: cur };
            results.push(matched);
            onMatch?.(matched);
          }
          if (file.type === 'DIR') await recurse(full, depth + 1);
        }
      } catch {
        /* skip */
      }
    };
    await recurse(path, 0);
    return results;
  }

  on(event: FTPEventType, callback: FTPProgressCallback | FTPErrorCallback): this {
    super.on(event, callback);
    return this;
  }

  off(event: FTPEventType, callback: FTPProgressCallback | FTPErrorCallback): this {
    super.off(event, callback);
    return this;
  }
}

export function createFTPService(config: FTPConfig): FTPService {
  return new FTPService({
    host: config.host,
    port: config.port ?? defaults.ftpPort,
    user: config.user ?? defaults.ftpUser,
    password: config.password ?? defaults.ftpPassword,
    secure: config.secure ?? defaults.ftpSecure,
    timeout: config.timeout ?? defaults.ftpTimeout,
    passive: config.passive ?? defaults.ftpPassive,
  });
}

/**
 * Download a file using a separate FTP client to avoid blocking browse operations.
 * Creates a new connection, downloads, then closes.
 */
export async function downloadWithSeparateClient(
  service: FTPService,
  remotePath: string,
  localPath: string,
  onProgress?: FTPProgressCallback,
): Promise<void> {
  const dlClient = await service.createDownloadClient();
  await ensureDirectoryExists(dirname(localPath));

  let totalSize = 0;
  try {
    totalSize = await dlClient.size(remotePath);
  } catch { /* size not supported */ }

  const existingSize = await getFileSize(localPath);
  const startOffset =
    existingSize > 0 && totalSize > 0 && totalSize > existingSize ? existingSize : 0;
  const filename = remotePath.split('/').filter(Boolean).pop() ?? remotePath;
  let downloaded = startOffset;
  const startTime = Date.now();
  let lastEmit = startTime;

  dlClient.trackProgress((info) => {
    downloaded = startOffset + info.bytesOverall;
    const now = Date.now();
    const elapsed = (now - startTime) / 1000;
    if (now - lastEmit < 200) return;
    lastEmit = now;
    const speed = elapsed > 0 ? downloaded / elapsed : 0;
    const remaining = totalSize > 0 ? totalSize - downloaded : 0;
    const eta = speed > 0 && remaining > 0 ? remaining / speed : 0;
    const p: DownloadProgress = {
      id: filename,
      filename,
      remotePath,
      localPath,
      totalSize,
      downloaded,
      speed,
      eta,
      status: 'downloading',
    };
    onProgress?.(p);
  });

  try {
    if (startOffset > 0) {
      await dlClient.downloadTo(localPath, remotePath, startOffset);
    } else {
      await dlClient.downloadTo(localPath, remotePath);
    }
    const done: DownloadProgress = {
      id: filename,
      filename,
      remotePath,
      localPath,
      totalSize: downloaded,
      downloaded,
      speed: 0,
      eta: 0,
      status: 'completed',
    };
    onProgress?.(done);
  } finally {
    dlClient.trackProgress(() => {});
    dlClient.close();
  }
}

/**
 * Download a directory recursively using separate clients per file.
 */
export async function downloadDirectoryWithSeparateClient(
  service: FTPService,
  remotePath: string,
  localPath: string,
  onProgress?: FTPProgressCallback,
): Promise<void> {
  await ensureDirectoryExists(localPath);
  const files = await service.list(remotePath);
  for (const file of files) {
    const r = remotePath === '/' ? `/${file.name}` : `${remotePath}/${file.name}`;
    const l = join(localPath, file.name);
    if (file.type === 'DIR') {
      await downloadDirectoryWithSeparateClient(service, r, l, onProgress);
    } else if (file.type === 'FILE') {
      await downloadWithSeparateClient(service, r, l, onProgress);
    }
  }
}
