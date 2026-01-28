import { create } from 'zustand';
import { FTPService, createFTPService } from '../services/ftpClient.js';
import type { FTPSlice, FTPConfig } from '../types/index.js';
import { defaults, paths } from '../utils/constants.js';

// Store FTP service instance outside the store (closure)
let ftpService: FTPService | null = null;

/**
 * FTP Slice
 * Manages FTP connection state, file listing, and navigation
 */
export const useFTPStore = create<FTPSlice>((set, get) => ({
  // State
  config: null,
  connected: false,
  currentPath: paths.root,
  files: [],
  loading: false,
  error: null,

  // Actions
  connect: async (config: FTPConfig) => {
    // Set loading state
    set({ loading: true, error: null });

    try {
      // Create FTP service instance
      ftpService = createFTPService({
        host: config.host,
        port: config.port ?? defaults.ftpPort,
        user: config.user ?? defaults.ftpUser,
        password: config.password ?? defaults.ftpPassword,
        secure: config.secure ?? defaults.ftpSecure,
        timeout: config.timeout ?? defaults.ftpTimeout,
        passive: config.passive ?? defaults.ftpPassive,
      });

      // Establish connection
      const connected = await ftpService.connect();
      
      if (connected) {
        // Set connected state and config
        set({
          connected: true,
          config,
          loading: false,
          error: null,
          currentPath: paths.root,
        });

        // Automatically list root directory
        const rootFiles = await ftpService.list(paths.root);
        set({
          files: rootFiles,
          currentPath: paths.root,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      set({
        connected: false,
        loading: false,
        error: errorMessage,
        config: null,
      });
      ftpService = null;
      throw error;
    }
  },

  disconnect: async () => {
    set({ loading: true });

    try {
      if (ftpService) {
        await ftpService.disconnect();
        ftpService = null;
      }

      set({
        connected: false,
        config: null,
        currentPath: paths.root,
        files: [],
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disconnect failed';
      set({
        loading: false,
        error: errorMessage,
      });
    }
  },

  listDirectory: async (path: string) => {
    if (!ftpService || !get().connected) {
      throw new Error('Not connected to FTP server');
    }

    set({ loading: true, error: null });

    try {
      const files = await ftpService.list(path);
      set({
        files,
        currentPath: path,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list directory';
      set({
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  navigate: async (path: string) => {
    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Automatically list directory after navigation
    await get().listDirectory(normalizedPath);
  },

  goBack: async () => {
    const currentPath = get().currentPath;
    
    // If already at root, do nothing
    if (currentPath === paths.root) {
      return;
    }

    // Get parent directory
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const parentPath = pathParts.length > 0 ? `/${pathParts.join('/')}` : paths.root;

    // Navigate to parent
    await get().navigate(parentPath);
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
