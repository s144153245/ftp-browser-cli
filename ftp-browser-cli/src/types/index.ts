// Core Types
export interface FTPConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
  secure?: boolean;
  timeout?: number;
  passive?: boolean;
}

export type FileType = 'DIR' | 'FILE' | 'LINK';

export interface FileItem {
  type: FileType;
  name: string;
  size: number | null;
  date: string | null;
  target?: string; // symlink target
  permissions?: string; // Unix permissions string (e.g., "drwxr-xr-x")
}

export type AppMode = 'browse' | 'search' | 'preview' | 'download' | 'help' | 'connecting';

export interface AppState {
  mode: AppMode;
  connected: boolean;
  currentPath: string;
  selectedIndex: number;
  error: string | null;
  loading: boolean;
}

export interface SearchState {
  query: string;
  results: FileItem[];
  isSearching: boolean;
  depth: number;
  currentSearchPath: string;
  maxDepth: number; // default: 5
}

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'paused' | 'cancelled';

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

export type FTPEventType = 'progress' | 'error' | 'connected' | 'disconnected';

export interface FTPEvent {
  type: FTPEventType;
  data?: any;
  error?: Error;
}

export type FTPProgressCallback = (progress: DownloadProgress) => void;
export type FTPErrorCallback = (error: Error) => void;

export interface FileInfo {
  path: string;
  type: FileType;
  size: number | null;
  date: string | null;
  permissions?: string;
  target?: string; // for symlinks
}

// Component Props Types
export interface AppProps {
  config: FTPConfig;
  downloadDir: string;
}

export interface HeaderProps {
  host: string;
  version?: string;
}

export interface BreadcrumbProps {
  path: string;
}

export interface FileListProps {
  items: FileItem[];
  selectedIndex: number;
  currentPage: number;
  itemsPerPage: number;
  onSelect: (index: number) => void;
  onEnter: (item: FileItem) => void;
}

export interface FileListItemProps {
  item: FileItem;
  index: number;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onEnter: () => void;
}

export interface StatusBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  mode: AppMode;
}

export interface InputPromptProps {
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export interface SearchBoxProps {
  isActive: boolean;
  query: string;
  onSearch: (query: string) => void;
  onCancel: () => void;
  isSearching?: boolean;
}

export interface PreviewProps {
  filePath: string;
  content: string;
  onClose: () => void;
}

export interface ProgressBarProps {
  progress: DownloadProgress;
}

export interface ModalProps {
  title: string;
  message: string;
  options?: string[];
  onSelect: (option: string) => void;
  onCancel: () => void;
}

export interface HelpPanelProps {
  onClose: () => void;
}

// Store Types
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

export interface UISlice {
  mode: AppMode;
  selectedIndex: number;
  currentPage: number;
  itemsPerPage: number;
  searchQuery: string;
  searchResults: FileItem[];
  isSearching: boolean;
  downloads: DownloadProgress[];
  checkedItems: Set<number>;
  setMode: (mode: AppMode) => void;
  setSelectedIndex: (index: number) => void;
  setCurrentPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
  addDownload: (download: DownloadProgress) => void;
  updateDownload: (id: string, updates: Partial<DownloadProgress>) => void;
  removeDownload: (id: string) => void;
  toggleCheck: (index: number) => void;
  clearChecked: () => void;
  isItemChecked: (index: number) => boolean;
}

// Utility Types
export type KeyboardHandler = (key: string, meta: {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}) => void;

export type FormatSizeFunction = (size: number | null) => string;
export type FormatDateFunction = (date: string | null) => string;
export type FormatPathFunction = (path: string) => string;

// Service interfaces (Group 02)
export interface IFileParser {
  parseListOutput(output: string): FileItem[];
  parseUnixList(line: string): FileItem | null;
  parseWindowsList(line: string): FileItem | null;
}

export interface IFTPService {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  list(path: string): Promise<FileItem[]>;
  download(
    remotePath: string,
    localPath: string,
    onProgress?: FTPProgressCallback
  ): Promise<void>;
  downloadDirectory(
    remotePath: string,
    localPath: string,
    onProgress?: FTPProgressCallback
  ): Promise<void>;
  getFileInfo(path: string): Promise<FileInfo>;
  preview(path: string, maxBytes?: number): Promise<string>;
  search(path: string, pattern: string, maxDepth?: number): Promise<FileItem[]>;
  on(
    event: FTPEventType,
    callback: FTPProgressCallback | FTPErrorCallback
  ): void;
  off(
    event: FTPEventType,
    callback: FTPProgressCallback | FTPErrorCallback
  ): void;
}

export interface IDownloadManager {
  addDownload(remotePath: string, localPath: string): string;
  cancelDownload(id: string): void;
  pauseDownload(id: string): void;
  resumeDownload(id: string): void;
  getDownloads(): DownloadProgress[];
  onProgress(id: string, callback: FTPProgressCallback): void;
}
