/**
 * FTP store: connection, current path, file list, navigate, goBack.
 */

import { create } from 'zustand';
import { createFTPService, setFtpService } from '../services/index.js';
import type { FTPSlice, FTPConfig } from '../types/index.js';
import { paths } from '../utils/constants.js';

let ftpService: import('../services/ftpClient.js').FTPService | null = null;

export const useFTPStore = create<FTPSlice>((set, get) => ({
  config: null,
  connected: false,
  currentPath: paths.root,
  files: [],
  loading: false,
  error: null,

  connect: async (config: FTPConfig) => {
    set({ loading: true, error: null });
    try {
      const svc = createFTPService({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        secure: config.secure,
        timeout: config.timeout,
        passive: config.passive,
      });
      ftpService = svc;
      const ok = await svc.connect();
      if (!ok) throw new Error('Connection failed');
      setFtpService(svc);
      set({
        connected: true,
        config,
        loading: false,
        error: null,
        currentPath: paths.root,
      });
      const rootFiles = await svc.list(paths.root);
      set({ files: rootFiles, currentPath: paths.root });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      ftpService = null;
      setFtpService(null);
      set({ connected: false, loading: false, error: msg, config: null });
      throw err;
    }
  },

  disconnect: async () => {
    set({ loading: true });
    try {
      if (ftpService) {
        await ftpService.disconnect();
        ftpService = null;
        setFtpService(null);
      }
      set({
        connected: false,
        config: null,
        currentPath: paths.root,
        files: [],
        loading: false,
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Disconnect failed';
      set({ loading: false, error: msg });
    }
  },

  listDirectory: async (path: string) => {
    if (!ftpService || !get().connected) throw new Error('Not connected to FTP server');
    set({ loading: true, error: null });
    try {
      const files = await ftpService.list(path);
      set({ files, currentPath: path, loading: false, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to list directory';
      set({ loading: false, error: msg });
      throw err;
    }
  },

  navigate: async (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    await get().listDirectory(normalized);
  },

  goBack: async () => {
    const cur = get().currentPath;
    if (cur === paths.root) return;
    const parts = cur.split('/').filter(Boolean);
    parts.pop();
    const parent = parts.length ? `/${parts.join('/')}` : paths.root;
    await get().navigate(parent);
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

export function getFtpService(): typeof ftpService {
  return ftpService;
}
