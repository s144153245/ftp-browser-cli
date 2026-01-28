import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type {
  DownloadProgress,
  DownloadStatus,
  FTPProgressCallback,
  IDownloadManager,
} from '../types/index.js';
import { defaults } from '../utils/constants.js';
import { DownloadError } from './errors.js';

/**
 * Download Manager Service
 * Manages multiple concurrent downloads with progress tracking, pause/resume, and cancellation
 */
export class DownloadManager extends EventEmitter implements IDownloadManager {
  private downloads: Map<string, DownloadProgress> = new Map();
  private activeDownloads: Set<string> = new Set();
  private maxConcurrent: number = 3;
  private downloadCallbacks: Map<string, FTPProgressCallback> = new Map();

  constructor(maxConcurrent: number = 3) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Adds a new download to the queue
   * @param remotePath - Remote file path
   * @param localPath - Local file path
   * @returns Download ID
   */
  addDownload(remotePath: string, localPath: string): string {
    const id = randomUUID();
    const filename = remotePath.split('/').pop() || remotePath;

    const download: DownloadProgress = {
      id,
      filename,
      remotePath,
      localPath,
      totalSize: 0,
      downloaded: 0,
      speed: 0,
      eta: 0,
      status: 'pending',
    };

    this.downloads.set(id, download);
    return id;
  }

  /**
   * Cancels a download
   * @param id - Download ID
   */
  cancelDownload(id: string): void {
    const download = this.downloads.get(id);
    if (!download) {
      return;
    }

    if (download.status === 'downloading' || download.status === 'paused') {
      download.status = 'cancelled';
      this.activeDownloads.delete(id);
      this.downloadCallbacks.delete(id);
      this.emit('downloadCancelled', id);
    }
  }

  /**
   * Pauses a download
   * @param id - Download ID
   */
  pauseDownload(id: string): void {
    const download = this.downloads.get(id);
    if (!download) {
      return;
    }

    if (download.status === 'downloading') {
      download.status = 'paused';
      this.activeDownloads.delete(id);
      this.emit('downloadPaused', id);
    }
  }

  /**
   * Resumes a paused download
   * @param id - Download ID
   */
  resumeDownload(id: string): void {
    const download = this.downloads.get(id);
    if (!download) {
      return;
    }

    if (download.status === 'paused') {
      download.status = 'pending';
      this.emit('downloadResumed', id);
    }
  }

  /**
   * Gets all downloads
   * @returns Array of DownloadProgress objects
   */
  getDownloads(): DownloadProgress[] {
    return Array.from(this.downloads.values());
  }

  /**
   * Gets a specific download by ID
   * @param id - Download ID
   * @returns DownloadProgress or undefined
   */
  getDownload(id: string): DownloadProgress | undefined {
    return this.downloads.get(id);
  }

  /**
   * Registers progress callback for a download
   * @param id - Download ID
   * @param callback - Progress callback function
   */
  onProgress(id: string, callback: FTPProgressCallback): void {
    this.downloadCallbacks.set(id, callback);
  }

  /**
   * Updates download progress
   * @param id - Download ID
   * @param updates - Partial download progress updates
   */
  updateProgress(id: string, updates: Partial<DownloadProgress>): void {
    const download = this.downloads.get(id);
    if (!download) {
      return;
    }

    Object.assign(download, updates);

    // Calculate speed and ETA if we have timing data
    if (updates.downloaded !== undefined && download.totalSize > 0) {
      // This would need to be enhanced with timing information
      // For now, we'll rely on the FTP service to provide speed/eta
    }

    // Call registered callback
    const callback = this.downloadCallbacks.get(id);
    if (callback) {
      callback(download);
    }

    this.emit('progress', download);
  }

  /**
   * Marks download as completed
   * @param id - Download ID
   */
  markCompleted(id: string): void {
    const download = this.downloads.get(id);
    if (!download) {
      return;
    }

    download.status = 'completed';
    download.downloaded = download.totalSize;
    download.speed = 0;
    download.eta = 0;
    this.activeDownloads.delete(id);

    const callback = this.downloadCallbacks.get(id);
    if (callback) {
      callback(download);
    }

    this.emit('downloadCompleted', id);
  }

  /**
   * Marks download as failed
   * @param id - Download ID
   * @param error - Error message
   */
  markFailed(id: string, error: string): void {
    const download = this.downloads.get(id);
    if (!download) {
      return;
    }

    download.status = 'failed';
    download.error = error;
    this.activeDownloads.delete(id);
    this.downloadCallbacks.delete(id);

    this.emit('downloadFailed', id, error);
  }

  /**
   * Starts a download (internal method, called by FTP service)
   * @param id - Download ID
   */
  startDownload(id: string): void {
    const download = this.downloads.get(id);
    if (!download) {
      return;
    }

    // Check if we've reached max concurrent downloads
    if (this.activeDownloads.size >= this.maxConcurrent) {
      // Will be started when a slot becomes available
      return;
    }

    download.status = 'downloading';
    this.activeDownloads.add(id);
    this.emit('downloadStarted', id);
  }

  /**
   * Checks if a download can be started (not at max concurrent)
   * @returns true if a new download can be started
   */
  canStartDownload(): boolean {
    return this.activeDownloads.size < this.maxConcurrent;
  }

  /**
   * Gets pending downloads that can be started
   * @returns Array of download IDs
   */
  getPendingDownloads(): string[] {
    return Array.from(this.downloads.values())
      .filter(d => d.status === 'pending')
      .map(d => d.id);
  }

  /**
   * Removes a download from the manager
   * @param id - Download ID
   */
  removeDownload(id: string): void {
    this.downloads.delete(id);
    this.activeDownloads.delete(id);
    this.downloadCallbacks.delete(id);
  }

  /**
   * Clears all downloads
   */
  clearDownloads(): void {
    this.downloads.clear();
    this.activeDownloads.clear();
    this.downloadCallbacks.clear();
  }

  /**
   * Gets download statistics
   * @returns Statistics object
   */
  getStatistics(): {
    total: number;
    pending: number;
    downloading: number;
    completed: number;
    failed: number;
    paused: number;
    cancelled: number;
  } {
    const downloads = Array.from(this.downloads.values());
    return {
      total: downloads.length,
      pending: downloads.filter(d => d.status === 'pending').length,
      downloading: downloads.filter(d => d.status === 'downloading').length,
      completed: downloads.filter(d => d.status === 'completed').length,
      failed: downloads.filter(d => d.status === 'failed').length,
      paused: downloads.filter(d => d.status === 'paused').length,
      cancelled: downloads.filter(d => d.status === 'cancelled').length,
    };
  }
}

/**
 * Creates a new DownloadManager instance
 * @param maxConcurrent - Maximum concurrent downloads (default: 3)
 * @returns DownloadManager instance
 */
export function createDownloadManager(maxConcurrent: number = 3): DownloadManager {
  return new DownloadManager(maxConcurrent);
}
