/**
 * Download manager: queue, progress, cancel. Uses FTPService for actual transfers.
 */

import { randomUUID } from 'crypto';
import type {
  DownloadProgress,
  FTPProgressCallback,
  IDownloadManager,
  IFTPService,
} from '../types/index.js';

let _ftpRef: IFTPService | null = null;

export function setFtpService(service: IFTPService | null): void {
  _ftpRef = service;
}

function ftpRef(): IFTPService | null {
  return _ftpRef;
}

const progressCallbacks = new Map<string, FTPProgressCallback>();

export class DownloadManager implements IDownloadManager {
  private downloads: Map<string, DownloadProgress> = new Map();
  private running: Set<string> = new Set();

  addDownload(remotePath: string, localPath: string): string {
    const id = randomUUID();
    const name = remotePath.split('/').filter(Boolean).pop() ?? remotePath;
    const d: DownloadProgress = {
      id,
      filename: name,
      remotePath,
      localPath,
      totalSize: 0,
      downloaded: 0,
      speed: 0,
      eta: 0,
      status: 'pending',
    };
    this.downloads.set(id, d);
    this.run(id);
    return id;
  }

  private async run(id: string): Promise<void> {
    const d = this.downloads.get(id);
    const ftp = ftpRef();
    if (!d || d.status !== 'pending' || !ftp) return;
    this.running.add(id);
    d.status = 'downloading';
    const cb = progressCallbacks.get(id);
    const onProg: FTPProgressCallback = (p) => {
      this.downloads.set(id, { ...p, id });
      cb?.(p);
    };
    try {
      await ftp.download(d.remotePath, d.localPath, onProg);
      const updated = this.downloads.get(id);
      if (updated) updated.status = 'completed';
    } catch (err) {
      const updated = this.downloads.get(id);
      if (updated) {
        updated.status = 'failed';
        updated.error = err instanceof Error ? err.message : 'Download failed';
      }
    } finally {
      this.running.delete(id);
      progressCallbacks.delete(id);
    }
  }

  cancelDownload(id: string): void {
    const d = this.downloads.get(id);
    if (!d) return;
    if (d.status === 'downloading' || d.status === 'paused') {
      d.status = 'cancelled';
      this.running.delete(id);
      progressCallbacks.delete(id);
    }
  }

  pauseDownload(_id: string): void {
    /* minimal impl: no-op */
  }

  resumeDownload(_id: string): void {
    /* minimal impl: no-op */
  }

  getDownloads(): DownloadProgress[] {
    return Array.from(this.downloads.values());
  }

  onProgress(id: string, callback: FTPProgressCallback): void {
    progressCallbacks.set(id, callback);
  }
}

export const downloadManager = new DownloadManager();
