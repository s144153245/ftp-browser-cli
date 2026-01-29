/**
 * Search: debounced query, run search, update results incrementally, cancel.
 * Uses batched incremental loading (200ms flush) so results appear as they are found.
 */

import { useCallback, useRef, useEffect } from 'react';
import { SearchService, createSearchService } from '../services/searchService.js';
import { getFtpService, useFTPStore } from '../store/ftpSlice.js';
import { useUIStore } from '../store/uiSlice.js';
import { defaults } from '../utils/constants.js';
import type { FileItem } from '../types/index.js';

const FLUSH_INTERVAL_MS = 200;

export function useSearch() {
  const currentPath = useFTPStore((s) => s.currentPath);
  const setSearchResults = useUIStore((s) => s.setSearchResults);
  const appendSearchResults = useUIStore((s) => s.appendSearchResults);
  const setIsSearching = useUIStore((s) => s.setIsSearching);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persistent search service ref — so cancelSearch cancels the right instance
  const svcRef = useRef<SearchService | null>(null);
  // Batch buffer and flush timer for incremental results
  const batchRef = useRef<FileItem[]>([]);
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBatch = useCallback(() => {
    if (batchRef.current.length === 0) return;
    const batch = batchRef.current;
    batchRef.current = [];
    appendSearchResults(batch);
  }, [appendSearchResults]);

  const runSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      const ftp = getFtpService();
      if (!ftp) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Create and store the service instance so cancel works
      const svc = createSearchService(ftp);
      svcRef.current = svc;

      // Clear previous results and batch buffer
      setSearchResults([]);
      batchRef.current = [];
      setIsSearching(true);

      // Set up periodic flush
      const flushTimer = setInterval(() => {
        flushBatch();
      }, FLUSH_INTERVAL_MS);
      flushRef.current = flushTimer as unknown as ReturnType<typeof setTimeout>;

      try {
        await svc.search(
          currentPath,
          q,
          defaults.maxSearchDepth,
          undefined, // onProgress
          (_item: FileItem) => {
            // Buffer each match for batched append
            batchRef.current.push(_item);
          }
        );
      } catch {
        // search failed or was cancelled
      } finally {
        // Final flush of remaining buffered items
        if (flushRef.current) {
          clearInterval(flushRef.current as unknown as number);
          flushRef.current = null;
        }
        flushBatch();
        setIsSearching(false);
        svcRef.current = null;
      }
    },
    [currentPath, setSearchResults, appendSearchResults, setIsSearching, flushBatch]
  );

  const runSearchDebounced = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const q = query.trim();
      if (!q) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        runSearch(query);
      }, defaults.searchDebounceMs);
    },
    [runSearch, setSearchResults, setIsSearching]
  );

  const cancelSearch = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (flushRef.current) {
      clearInterval(flushRef.current as unknown as number);
      flushRef.current = null;
    }
    if (svcRef.current) {
      svcRef.current.cancel();
      svcRef.current = null;
    }
    batchRef.current = [];
    setIsSearching(false);
  }, [setIsSearching]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (flushRef.current) clearInterval(flushRef.current as unknown as number);
    if (svcRef.current) svcRef.current.cancel();
  }, []);

  return { runSearchDebounced, cancelSearch, runSearch };
}
