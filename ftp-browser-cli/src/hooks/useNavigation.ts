/**
 * Navigation: directory enter, go back, symlink follow, file selection.
 */

import { useCallback } from 'react';
import { useFTPStore } from '../store/ftpSlice.js';
import { useUIStore } from '../store/uiSlice.js';
import { joinPath } from '../utils/path.js';
import type { FileItem } from '../types/index.js';

export function useNavigation() {
  const currentPath = useFTPStore((s) => s.currentPath);
  const navigate = useFTPStore((s) => s.navigate);
  const goBack = useFTPStore((s) => s.goBack);
  const setError = useFTPStore((s) => s.setError);
  const resetSelection = useUIStore((s) => s.resetSelection);
  const setMode = useUIStore((s) => s.setMode);

  const navigateTo = useCallback(
    async (path: string) => {
      try {
        resetSelection();
        await navigate(path);
      } catch (err) {
        setError?.(err instanceof Error ? err.message : 'Navigation failed');
      }
    },
    [navigate, resetSelection, setError]
  );

  const handleEnter = useCallback(
    async (item: FileItem) => {
      if (item.type === 'DIR') {
        const next = currentPath === '/' ? `/${item.name}` : joinPath(currentPath, item.name);
        await navigateTo(next);
        return;
      }
      if (item.type === 'LINK') {
        const target = item.target ?? item.name;
        const next = target.startsWith('/') ? target : joinPath(currentPath, target);
        await navigateTo(next);
        return;
      }
      if (item.type === 'FILE') {
        setMode('browse');
      }
    },
    [currentPath, navigateTo, setMode]
  );

  const handleGoBack = useCallback(async () => {
    try {
      resetSelection();
      await goBack();
    } catch (err) {
      setError?.(err instanceof Error ? err.message : 'Go back failed');
    }
  }, [goBack, resetSelection, setError]);

  return { handleEnter, handleGoBack, navigateTo };
}
