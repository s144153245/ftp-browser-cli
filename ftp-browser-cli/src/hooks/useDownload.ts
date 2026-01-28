/**
 * Download: add file/dir to queue, sync progress to UI store, cancel.
 */

import { useCallback } from 'react';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { downloadManager } from '../services/downloadManager.js';
import { getFtpService } from '../store/ftpSlice.js';
import { useUIStore } from '../store/uiSlice.js';
import type { FileItem } from '../types/index.js';

export function useDownload(downloadDir: string) {
  const addDownload = useUIStore((s) => s.addDownload);
  const updateDownload = useUIStore((s) => s.updateDownload);
  const removeDownload = useUIStore((s) => s.removeDownload);
  const downloads = useUIStore((s) => s.downloads);

  const addFileDownload = useCallback(
    (item: FileItem, remoteBase: string) => {
      if (item.type !== 'FILE') return;
      const remotePath = remoteBase === '/' ? `/${item.name}` : `${remoteBase}/${item.name}`;
      const localPath = join(downloadDir, item.name);
      const id = downloadManager.addDownload(remotePath, localPath);
      const progress = downloadManager.getDownloads().find((d) => d.id === id);
      if (progress) addDownload(progress);
      downloadManager.onProgress(id, (p) => updateDownload(id, p));
    },
    [addDownload, updateDownload, downloadDir]
  );

  const addDirectoryDownload = useCallback(
    (item: FileItem, remoteBase: string, recursive: boolean) => {
      if (item.type !== 'DIR') return;
      const remotePath = remoteBase === '/' ? `/${item.name}` : `${remoteBase}/${item.name}`;
      const localPath = join(downloadDir, item.name);
      const ftp = getFtpService();
      if (!ftp) return;
      const id = randomUUID();
      const progress = {
        id,
        filename: item.name,
        remotePath,
        localPath,
        totalSize: 0,
        downloaded: 0,
        speed: 0,
        eta: 0,
        status: 'downloading' as const,
      };
      addDownload(progress);
      if (recursive) {
        ftp.downloadDirectory(remotePath, localPath, (p) =>
          updateDownload(id, { ...p, id })
        ).catch((err) => {
          updateDownload(id, {
            status: 'failed',
            error: err instanceof Error ? err.message : 'Directory download failed',
          });
        });
      } else {
        ftp.download(remotePath, localPath, (p) =>
          updateDownload(id, { ...p, id })
        ).catch((err) => {
          updateDownload(id, {
            status: 'failed',
            error: err instanceof Error ? err.message : 'Download failed',
          });
        });
      }
    },
    [addDownload, updateDownload, downloadDir]
  );

  const cancelDownload = useCallback(
    (id: string) => {
      downloadManager.cancelDownload(id);
      removeDownload(id);
    },
    [removeDownload]
  );

  return {
    downloads,
    addFileDownload,
    addDirectoryDownload,
    cancelDownload,
  };
}
