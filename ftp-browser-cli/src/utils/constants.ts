import chalk from 'chalk';

// Color Scheme
export const colors = {
  // File types
  directory: chalk.green,
  file: chalk.white,
  symlink: chalk.magenta,
  executable: chalk.red,
  
  // UI elements
  border: chalk.blue,
  selected: chalk.cyan,
  highlight: chalk.yellow,
  error: chalk.red,
  success: chalk.green,
  warning: chalk.yellow,
  muted: chalk.gray,
  info: chalk.blue,
  
  // File sizes
  sizeSmall: chalk.gray,      // < 1MB
  sizeMedium: chalk.yellow,   // 1MB - 100MB
  sizeLarge: chalk.red,       // > 100MB
} as const;

// Icons
export const icons = {
  // File types
  directory: '📁',
  file: '📄',
  symlink: '🔗',
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  archive: '📦',
  code: '💻',
  text: '📝',
  pdf: '📕',
  
  // Status icons
  loading: '⏳',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  download: '⬇️',
  search: '🔍',
  folder: '📂',
} as const;

// Border Characters
export const borders = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  topT: '╦',
  bottomT: '╩',
  leftT: '╠',
  rightT: '╣',
  cross: '╬',
} as const;

// Default Configuration
export const defaults = {
  // FTP
  ftpPort: 21,
  ftpUser: 'anonymous',
  ftpPassword: '',
  ftpTimeout: 10000, // 10 seconds
  ftpSecure: false,
  ftpPassive: true,
  
  // UI
  itemsPerPage: 20,
  maxPreviewLines: 50,
  maxPreviewBytes: 10240, // 10KB
  
  // Search
  maxSearchDepth: 5,
  searchDebounceMs: 300,
  
  // Download
  downloadDir: './downloads',
  downloadTimeout: 3600000, // 1 hour
  resumeThreshold: 1024, // 1KB - files smaller than this won't resume
  
  // Terminal
  minTerminalWidth: 60,
  chromeRows: 15, // header + breadcrumb + info panel + status bar + spacing
  minItemsPerPage: 10,
  maxItemsPerPage: 40,
} as const;

// Keyboard Shortcuts
export const keys = {
  // Navigation
  up: ['up', 'k'],
  down: ['down', 'j'],
  enter: ['return', 'enter'],
  back: ['left', 'backspace'],
  forward: ['right'],

  // Actions
  search: '/',
  download: 'd',
  preview: 'p',

  refresh: 'r',
  select: 'space',
  selectAll: 'a',
  help: ['?', 'h'],
  quit: 'q',
  escape: 'escape',

  // Pagination
  nextPage: ['n', 'pagedown'],
  prevPage: ['pageup'],
  firstPage: 'g',
  lastPage: 'G',

  // Numbers for quick cursor move
  quickMove: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
} as const;

// Text Extensions for Preview
export const textExtensions = [
  'txt',
  'log',
  'json',
  'py',
  'sh',
  'bash',
  'zsh',
  'yml',
  'yaml',
  'xml',
  'md',
  'markdown',
  'conf',
  'cfg',
  'config',
  'ini',
  'toml',
  'js',
  'ts',
  'jsx',
  'tsx',
  'css',
  'html',
  'htm',
  'csv',
  'tsv',
] as const;

// File Size Thresholds
export const sizeThresholds = {
  small: 1024 * 1024,        // 1MB
  medium: 100 * 1024 * 1024, // 100MB
} as const;

// Error Messages
export const errorMessages = {
  dnsResolve: 'Cannot resolve hostname',
  connection: 'Cannot connect to FTP server',
  accessDenied: 'Permission denied',
  timeout: 'Connection timeout',
  login: 'Authentication failed',
  notFound: 'File or directory not found',
  downloadFailed: 'Download failed',
  invalidPath: 'Invalid path',
  noPermission: 'No permission to access',
} as const;

// Status Messages
export const statusMessages = {
  connecting: 'Connecting...',
  connected: 'Connected',
  disconnecting: 'Disconnecting...',
  disconnected: 'Disconnected',
  loading: 'Loading...',
  searching: 'Searching...',
  downloading: 'Downloading...',
  completed: 'Completed',
  failed: 'Failed',
} as const;

// UI Layout Constants
export const layout = {
  headerHeight: 3,
  statusBarHeight: 2,
  minListHeight: 10,
  padding: 1,
} as const;

// File Path Constants
export const paths = {
  root: '/',
  parent: '..',
  current: '.',
  separator: '/',
} as const;

// Regular Expressions
export const patterns = {
  // Unix-style LIST output: drwxr-xr-x 2 user group 4096 Jan 28 10:30 filename
  unixList: /^([d\-l])([rwx\-]{9})\s+\d+\s+\w+\s+\w+\s+(\d+)\s+(\w{3}\s+\d{1,2}\s+[\d:]+)\s+(.+)$/,
  
  // Windows-style LIST output: 01-28-24 10:30AM <DIR> folder
  windowsList: /^(\d{2}-\d{2}-\d{2,4})\s+(\d{1,2}:\d{2}(?:AM|PM))\s+(<DIR>|\d+)\s+(.+)$/,
  
  // Symlink: filename -> target
  symlink: /^(.+)\s+->\s+(.+)$/,
  
  // File extension
  fileExtension: /\.([^.]+)$/,
} as const;

// Version Information
export const version = {
  major: 1,
  minor: 3,
  patch: 2,
  name: 'FTP_Browser-CLI',
  full: '1.3.2',
} as const;

/**
 * Returns the usable terminal width, with a minimum of minTerminalWidth.
 */
export function getTerminalWidth(): number {
  const cols = process.stdout.columns || 80;
  return Math.max(defaults.minTerminalWidth, cols);
}

/**
 * Returns the current terminal height in rows.
 */
export function getTerminalHeight(): number {
  return process.stdout.rows || 24;
}

/**
 * Calculates items per page based on terminal height, reserving space for chrome (header, breadcrumb, status bar).
 */
export function calculateItemsPerPage(): number {
  const rows = getTerminalHeight();
  const raw = rows - defaults.chromeRows;
  return Math.min(defaults.maxItemsPerPage, Math.max(defaults.minItemsPerPage, raw));
}
