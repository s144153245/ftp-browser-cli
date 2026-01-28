import type { FileItem, IFTPService } from '../types/index.js';
import { defaults } from '../utils/constants.js';

/**
 * Search Service
 * Provides recursive file search functionality on FTP servers
 */
export class SearchService {
  private isCancelled: boolean = false;
  private ftpService: IFTPService;

  constructor(ftpService: IFTPService) {
    this.ftpService = ftpService;
  }

  /**
   * Searches for files matching pattern recursively
   * @param startPath - Starting path for search
   * @param pattern - Search pattern (case-insensitive by default)
   * @param maxDepth - Maximum search depth (default: 5)
   * @param onProgress - Optional progress callback (current path being searched)
   * @returns Array of matching FileItem objects
   */
  async search(
    startPath: string,
    pattern: string,
    maxDepth?: number,
    onProgress?: (currentPath: string) => void
  ): Promise<FileItem[]> {
    this.isCancelled = false;
    const depthLimit = maxDepth ?? defaults.maxSearchDepth;
    const results: FileItem[] = [];
    const patternLower = pattern.toLowerCase();

    try {
      await this.searchRecursive(startPath, patternLower, depthLimit, 0, results, onProgress);
    } catch (error) {
      if (this.isCancelled) {
        return results; // Return partial results if cancelled
      }
      throw error;
    }

    return results;
  }

  /**
   * Recursive search implementation
   * @param currentPath - Current directory path
   * @param patternLower - Lowercase search pattern
   * @param maxDepth - Maximum depth limit
   * @param currentDepth - Current depth
   * @param results - Results array to populate
   * @param onProgress - Progress callback
   */
  private async searchRecursive(
    currentPath: string,
    patternLower: string,
    maxDepth: number,
    currentDepth: number,
    results: FileItem[],
    onProgress?: (currentPath: string) => void
  ): Promise<void> {
    // Check if cancelled
    if (this.isCancelled) {
      return;
    }

    // Check depth limit
    if (currentDepth >= maxDepth) {
      return;
    }

    // Report progress
    if (onProgress) {
      onProgress(currentPath);
    }

    try {
      // List directory
      const files = await this.ftpService.list(currentPath);

      for (const file of files) {
        // Check if cancelled
        if (this.isCancelled) {
          return;
        }

        // Build full path
        const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;

        // Check if filename matches pattern
        if (file.name.toLowerCase().includes(patternLower)) {
          results.push(file);
        }

        // Recursively search subdirectories
        if (file.type === 'DIR') {
          try {
            await this.searchRecursive(
              fullPath,
              patternLower,
              maxDepth,
              currentDepth + 1,
              results,
              onProgress
            );
          } catch (error) {
            // Log error but continue searching other directories
            // Don't throw to allow search to continue
            // In a real implementation, you might want to log this
          }
        }
      }
    } catch (error) {
      // If error accessing directory, log but continue
      // Don't throw to allow search to continue in other branches
      // In a real implementation, you might want to log this
    }
  }

  /**
   * Cancels the current search operation
   */
  cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Checks if search is cancelled
   * @returns true if search is cancelled
   */
  isSearchCancelled(): boolean {
    return this.isCancelled;
  }

  /**
   * Resets cancellation flag (for new search)
   */
  reset(): void {
    this.isCancelled = false;
  }
}

/**
 * Creates a new SearchService instance
 * @param ftpService - FTP service instance
 * @returns SearchService instance
 */
export function createSearchService(ftpService: IFTPService): SearchService {
  return new SearchService(ftpService);
}
