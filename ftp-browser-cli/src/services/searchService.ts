/**
 * Search service: recursive search with cancel and progress.
 */

import type { FileItem, IFTPService } from '../types/index.js';
import { defaults } from '../utils/constants.js';

export class SearchService {
  private cancelled = false;
  constructor(private ftp: IFTPService) {}

  async search(
    startPath: string,
    pattern: string,
    maxDepth?: number,
    onProgress?: (currentPath: string) => void,
    onMatch?: (item: FileItem) => void
  ): Promise<FileItem[]> {
    this.cancelled = false;
    const limit = maxDepth ?? defaults.maxSearchDepth;
    const results: FileItem[] = [];
    const pat = pattern.toLowerCase();

    const recurse = async (
      cur: string,
      depth: number
    ): Promise<void> => {
      if (this.cancelled || depth >= limit) return;
      onProgress?.(cur);
      try {
        const files = await this.ftp.list(cur);
        for (const f of files) {
          if (this.cancelled) return;
          const full = cur === '/' ? `/${f.name}` : `${cur}/${f.name}`;
          if (f.name.toLowerCase().includes(pat)) {
            const matched = { ...f, path: cur };
            results.push(matched);
            onMatch?.(matched);
          }
          if (f.type === 'DIR') await recurse(full, depth + 1);
        }
      } catch {
        /* skip */
      }
    };

    await recurse(startPath, 0);
    return results;
  }

  cancel(): void {
    this.cancelled = true;
  }
}

export function createSearchService(ftp: IFTPService): SearchService {
  return new SearchService(ftp);
}
