import type { UISlice, FTPSlice, FileItem } from '../types/index.js';

/**
 * Select paginated files based on current page and items per page
 * @param uiState - UI slice state
 * @param ftpState - FTP slice state
 * @returns Array of FileItem for current page
 */
export const selectPaginatedFiles = (uiState: UISlice, ftpState: FTPSlice): FileItem[] => {
  const { currentPage, itemsPerPage } = uiState;
  const files = uiState.searchResults.length > 0 ? uiState.searchResults : ftpState.files;
  const start = currentPage * itemsPerPage;
  const end = start + itemsPerPage;
  return files.slice(start, end);
};

/**
 * Select total pages based on file count and items per page
 * @param uiState - UI slice state
 * @param fileCount - Total number of files
 * @returns Total number of pages
 */
export const selectTotalPages = (uiState: UISlice, fileCount: number): number => {
  return Math.ceil(fileCount / uiState.itemsPerPage);
};

/**
 * Select current file item based on selected index and pagination
 * @param uiState - UI slice state
 * @param ftpState - FTP slice state
 * @returns Current FileItem or null if no selection
 */
export const selectCurrentFile = (uiState: UISlice, ftpState: FTPSlice): FileItem | null => {
  const files = selectPaginatedFiles(uiState, ftpState);
  return files[uiState.selectedIndex] || null;
};

/**
 * Select files to display (either search results or regular files)
 * @param uiState - UI slice state
 * @param ftpState - FTP slice state
 * @returns Array of FileItem to display
 */
export const selectDisplayFiles = (uiState: UISlice, ftpState: FTPSlice): FileItem[] => {
  return uiState.searchResults.length > 0 ? uiState.searchResults : ftpState.files;
};

/**
 * Select total file count for pagination
 * @param uiState - UI slice state
 * @param ftpState - FTP slice state
 * @returns Total number of files
 */
export const selectTotalFileCount = (uiState: UISlice, ftpState: FTPSlice): number => {
  return uiState.searchResults.length > 0 ? uiState.searchResults.length : ftpState.files.length;
};
