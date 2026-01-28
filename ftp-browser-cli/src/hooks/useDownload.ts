/**
 * Download: add file/dir to queue, sync progress to UI store, cancel.
 * Uses separate FTP connections for downloads to avoid blocking browsing.
 */

import { useCallback } from 'react';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { getFtpService } from '../store/ftpSlice.js';
import { downloadWithSeparateClient, downloadDirectoryWithSeparateClient } from '../services/ftpClient.js';
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
      const ftp = getFtpService();
      if (!ftp) return;
      const remotePath = remoteBase === '/' ? `/${item.name}` : `${remoteBase}/${item.name}`;
      const localPath = join(downloadDir, item.name);
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
      downloadWithSeparateClient(ftp, remotePath, localPath, (p) =>
        updateDownload(id, { ...p, id })
      )
        .then(() => {
          updateDownload(id, { status: 'completed' });
        })
        .catch((err) => {
          updateDownload(id, {
            status: 'failed',
            error: err instanceof Error ? err.message : 'Download failed',
          });
        });
    },
    [addDownload, updateDownload, downloadDir]
  );

  const addDirectoryDownload = useCallback(
    (item: FileItem, remoteBase: string, recursive: boolean) => {
      if (item.type !== 'DIR') return;
      const ftp = getFtpService();
      if (!ftp) return;
      const remotePath = remoteBase === '/' ? `/${item.name}` : `${remoteBase}/${item.name}`;
      const localPath = join(downloadDir, item.name);
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
        downloadDirectoryWithSeparateClient(ftp, remotePath, localPath, (p) =>
          updateDownload(id, { ...p, id })
        )
          .then(() => {
            updateDownload(id, { status: 'completed' });
          })
          .catch((err) => {
            updateDownload(id, {
              status: 'failed',
              error: err instanceof Error ? err.message : 'Directory download failed',
            });
          });
      } else {
        downloadWithSeparateClient(ftp, remotePath, localPath, (p) =>
          updateDownload(id, { ...p, id })
        )
          .then(() => {
            updateDownload(id, { status: 'completed' });
          })
          .catch((err) => {
            updateDownload(id, {
              status: 'failed',
              error: err instanceof Error ? err.message : 'Download failed',
            });
          });
      }
    },
    [addDownload, updateDownload, downloadDir]
  );

  const downloadSelected = useCallback(
    (items: FileItem[], remoteBase: string) => {
      for (const item of items) {
        if (item.type === 'FILE') {
          addFileDownload(item, remoteBase);
        } else if (item.type === 'DIR') {
          addDirectoryDownload(item, remoteBase, true);
        }
      }
    },
    [addFileDownload, addDirectoryDownload]
  );

  const cancelDownload = useCallback(
    (id: string) => {
      removeDownload(id);
    },
    [removeDownload]
  );

  return {
    downloads,
    addFileDownload,
    addDirectoryDownload,
    downloadSelected,
    cancelDownload,
  };
}
