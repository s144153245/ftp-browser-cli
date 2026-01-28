// Core Types

/**
 * FTP Configuration
 */
export interface FTPConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
  secure?: boolean;
  timeout?: number;
  passive?: boolean;
}

/**
 * File Type
 */
export type FileType = 'DIR' | 'FILE' | 'LINK';

/**
 * File Item
 */
export interface FileItem {
  type: FileType;
  name: string;
  size: number | null;
  date: string | null;
  target?: string; // symlink target
  permissions?: string; // Unix permissions string (e.g., "drwxr-xr-x")
}

/**
 * Application Mode
 */
export type AppMode = 'browse' | 'search' | 'preview' | 'download' | 'help' | 'connecting';

/**
 * Application State
 */
export interface AppState {
  mode: AppMode;
  connected: boolean;
  currentPath: string;
  selectedIndex: number;
  error: string | null;
  loading: boolean;
}

/**
 * Search State
 */
export interface SearchState {
  query: string;
  results: FileItem[];
  isSearching: boolean;
  depth: number;
  currentSearchPath: string;
  maxDepth: number; // default: 5
}

/**
 * Download Status
 */
export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'paused' | 'cancelled';

/**
 * Download Progress
 */
export interface DownloadProgress {
  id: string; // unique identifier
  filename: string;
  remotePath: string;
  localPath: string;
  totalSize: number;
  downloaded: number;
  speed: number; // bytes per second
  eta: number; // estimated seconds remaining
  status: DownloadStatus;
  error?: string;
}

/**
 * FTP Event Type
 */
export type FTPEventType = 'progress' | 'error' | 'connected' | 'disconnected';

/**
 * FTP Event
 */
export interface FTPEvent {
  type: FTPEventType;
  data?: any;
  error?: Error;
}

/**
 * FTP Progress Callback
 */
export type FTPProgressCallback = (progress: DownloadProgress) => void;

/**
 * FTP Error Callback
 */
export type FTPErrorCallback = (error: Error) => void;

/**
 * File Info
 */
export interface FileInfo {
  path: string;
  type: FileType;
  size: number | null;
  date: string | null;
  permissions?: string;
  target?: string; // for symlinks
}

// Component Props Types

/**
 * App Component Props
 */
export interface AppProps {
  config: FTPConfig;
  downloadDir: string;
}

/**
 * FileList Component Props
 */
export interface FileListProps {
  items: FileItem[];
  selectedIndex: number;
  currentPage: number;
  itemsPerPage: number;
  onSelect: (index: number) => void;
  onEnter: (item: FileItem) => void;
}

/**
 * SearchBox Component Props
 */
export interface SearchBoxProps {
  isActive: boolean;
  onSearch: (query: string) => void;
  onCancel: () => void;
}

/**
 * Preview Component Props
 */
export interface PreviewProps {
  filePath: string;
  content: string;
  onClose: () => void;
}

/**
 * ProgressBar Component Props
 */
export interface ProgressBarProps {
  progress: DownloadProgress;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

// Store Types

/**
 * FTP Slice
 */
export interface FTPSlice {
  config: FTPConfig | null;
  connected: boolean;
  currentPath: string;
  files: FileItem[];
  loading: boolean;
  error: string | null;
  connect: (config: FTPConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  listDirectory: (path: string) => Promise<void>;
  navigate: (path: string) => Promise<void>;
  goBack: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * UI Slice
 */
export interface UISlice {
  mode: AppMode;
  selectedIndex: number;
  currentPage: number;
  itemsPerPage: number;
  searchQuery: string;
  searchResults: FileItem[];
  isSearching: boolean;
  downloads: DownloadProgress[];
  setMode: (mode: AppMode) => void;
  setSelectedIndex: (index: number) => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: FileItem[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  addDownload: (download: DownloadProgress) => void;
  updateDownload: (id: string, updates: Partial<DownloadProgress>) => void;
  removeDownload: (id: string) => void;
  resetSelection: () => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
}

// Service Types

/**
 * FTP Service Interface
 */
export interface IFTPService {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  list(path: string): Promise<FileItem[]>;
  download(remotePath: string, localPath: string, onProgress?: FTPProgressCallback): Promise<void>;
  downloadDirectory(remotePath: string, localPath: string, onProgress?: FTPProgressCallback): Promise<void>;
  getFileInfo(path: string): Promise<FileInfo>;
  preview(path: string, maxBytes?: number): Promise<string>;
  search(path: string, pattern: string, maxDepth?: number): Promise<FileItem[]>;
  on(event: FTPEventType, callback: FTPProgressCallback | FTPErrorCallback): void;
  off(event: FTPEventType, callback: FTPProgressCallback | FTPErrorCallback): void;
}

/**
 * File Parser Interface
 */
export interface IFileParser {
  parseListOutput(output: string): FileItem[];
  parseUnixList(line: string): FileItem | null;
  parseWindowsList(line: string): FileItem | null;
}

/**
 * Download Manager Interface
 */
export interface IDownloadManager {
  addDownload(remotePath: string, localPath: string): string; // returns download ID
  cancelDownload(id: string): void;
  pauseDownload(id: string): void;
  resumeDownload(id: string): void;
  getDownloads(): DownloadProgress[];
  onProgress(id: string, callback: FTPProgressCallback): void;
}

// Utility Types

/**
 * Keyboard Event Handler
 */
export type KeyboardHandler = (key: string, meta: {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}) => void;

/**
 * Format Size Function
 */
export type FormatSizeFunction = (size: number | null) => string;

/**
 * Format Date Function
 */
export type FormatDateFunction = (date: string | null) => string;

/**
 * Format Path Function
 */
export type FormatPathFunction = (path: string) => string;

// Constants Types

/**
 * Color Name
 */
export type ColorName = 
  | 'directory'
  | 'file'
  | 'symlink'
  | 'executable'
  | 'border'
  | 'selected'
  | 'highlight'
  | 'error'
  | 'success'
  | 'muted'
  | 'sizeSmall'
  | 'sizeMedium'
  | 'sizeLarge';

/**
 * Icon Type
 */
export type IconType =
  | 'directory'
  | 'file'
  | 'symlink'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'text'
  | 'pdf'
  | 'loading'
  | 'success'
  | 'error'
  | 'warning'
  | 'download'
  | 'search';
