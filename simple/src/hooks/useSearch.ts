/**
 * Search: debounced query, run search, update results, cancel.
 */

import { useCallback, useRef, useEffect } from 'react';
import { createSearchService } from '../services/searchService.js';
import { getFtpService, useFTPStore } from '../store/ftpSlice.js';
import { useUIStore } from '../store/uiSlice.js';
import { defaults } from '../utils/constants.js';

function getSearchService() {
  const ftp = getFtpService();
  if (!ftp) return null;
  return createSearchService(ftp);
}

export function useSearch() {
  const currentPath = useFTPStore((s) => s.currentPath);
  const setSearchResults = useUIStore((s) => s.setSearchResults);
  const setIsSearching = useUIStore((s) => s.setIsSearching);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      const svc = getSearchService();
      if (!svc) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const results = await svc.search(currentPath, q, defaults.maxSearchDepth);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [currentPath, setSearchResults, setIsSearching]
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
    const svc = getSearchService();
    if (svc) svc.cancel();
    setIsSearching(false);
  }, [setIsSearching]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { runSearchDebounced, cancelSearch, runSearch };
}
