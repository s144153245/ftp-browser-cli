/**
 * Central keyboard handler: new key bindings with multi-select support.
 *
 * Browse mode keys:
 *   Up/k        Move cursor up
 *   Down/j      Move cursor down
 *   Left/Bksp   Go back (parent dir)
 *   Right/Enter  Enter directory (DIR/LINK)
 *   Enter (FILE) Toggle selection
 *   Space        Toggle selection on current item
 *   d            Download selected items (or current if none selected)
 *   p            Preview current file
 *   /            Start search
 *   r            Refresh directory
 *   ?/h          Show help
 *   PageDown     Next page
 *   PageUp       Previous page
 *   g            First page
 *   G            Last page
 *   1-9          Quick move cursor to item N on current page
 *   Esc          Clear selection -> go back -> no-op at root
 *   q            Quit app
 *
 * Search mode:
 *   Tab          Toggle between input and result navigation
 *   Esc          Clear selection -> exit search
 *   (input mode) Arrow keys auto-switch to navigate mode
 *   (navigate)   Space/d/a/Enter/arrows work like browse mode
 */

import { useInput } from 'ink';
import { useCallback } from 'react';
import { useFTPStore } from '../store/ftpSlice.js';
import { useUIStore } from '../store/uiSlice.js';
import { useNavigation } from './useNavigation.js';
import { useDownload } from './useDownload.js';
import type { FileItem } from '../types/index.js';

export function useKeyboard(opts: {
  downloadDir: string;
  onPreview: (item: FileItem) => void;
  exit: () => void;
}) {
  const { downloadDir, onPreview, exit } = opts;
  const nav = useNavigation();
  const dl = useDownload(downloadDir);

  const mode = useUIStore((s) => s.mode);
  const setMode = useUIStore((s) => s.setMode);
  const setSelectedIndex = useUIStore((s) => s.setSelectedIndex);
  const setCurrentPage = useUIStore((s) => s.setCurrentPage);
  const selectedIndex = useUIStore((s) => s.selectedIndex);
  const currentPage = useUIStore((s) => s.currentPage);
  const itemsPerPage = useUIStore((s) => s.itemsPerPage);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const toggleCheck = useUIStore((s) => s.toggleCheck);
  const clearChecked = useUIStore((s) => s.clearChecked);
  const checkedItems = useUIStore((s) => s.checkedItems);
  const checkAll = useUIStore((s) => s.checkAll);
  const searchInputFocused = useUIStore((s) => s.searchInputFocused);
  const setSearchInputFocused = useUIStore((s) => s.setSearchInputFocused);

  const files = useFTPStore((s) => s.files);
  const loading = useFTPStore((s) => s.loading);
  const listDirectory = useFTPStore((s) => s.listDirectory);
  const currentPath = useFTPStore((s) => s.currentPath);

  const searchResults = useUIStore((s) => s.searchResults);
  const displayItems = mode === 'search' ? searchResults : files;
  const totalPages = Math.ceil(displayItems.length / itemsPerPage);
  const globalIndex = currentPage * itemsPerPage + selectedIndex;
  const selectedItem = displayItems[globalIndex] ?? null;

  const prevPage = useUIStore((s) => s.prevPage);
  const nextPage = useUIStore((s) => s.nextPage);
  const goToFirstPage = useUIStore((s) => s.goToFirstPage);
  const goToLastPage = useUIStore((s) => s.goToLastPage);

  const moveCursor = useCallback(
    (newGlobalIndex: number) => {
      if (newGlobalIndex < 0 || newGlobalIndex >= displayItems.length) return;
      const page = Math.floor(newGlobalIndex / itemsPerPage);
      const idx = newGlobalIndex % itemsPerPage;
      setCurrentPage(page);
      setSelectedIndex(idx);
    },
    [displayItems.length, itemsPerPage, setCurrentPage, setSelectedIndex]
  );

  const handleBrowse = useCallback(
    (
      input: string,
      key: {
        upArrow?: boolean;
        downArrow?: boolean;
        leftArrow?: boolean;
        rightArrow?: boolean;
        return?: boolean;
        backspace?: boolean;
        pageUp?: boolean;
        pageDown?: boolean;
        escape?: boolean;
        ctrl?: boolean;
      }
    ) => {
      if (loading) return;

      // Quit
      if (input === 'q') {
        exit();
        return;
      }

      // Escape: clear selection -> go back -> no-op at root
      if (key.escape) {
        if (checkedItems.size > 0) {
          clearChecked();
        } else if (currentPath !== '/') {
          nav.handleGoBack();
        }
        return;
      }

      // Help
      if (input === '?' || input === 'h') {
        setMode('help');
        return;
      }

      // Move cursor up
      if (key.upArrow || input === 'k') {
        moveCursor(globalIndex - 1);
        return;
      }

      // Move cursor down
      if (key.downArrow || input === 'j') {
        moveCursor(globalIndex + 1);
        return;
      }

      // Go back (parent dir)
      if (key.leftArrow || key.backspace) {
        nav.handleGoBack();
        return;
      }

      // Enter directory (right arrow)
      if (key.rightArrow) {
        if (selectedItem && (selectedItem.type === 'DIR' || selectedItem.type === 'LINK')) {
          nav.handleEnter(selectedItem);
        }
        return;
      }

      // PageUp
      if (key.pageUp) {
        prevPage();
        return;
      }

      // Next page
      if (key.pageDown) {
        nextPage(displayItems.length);
        return;
      }

      // First page
      if (input === 'g') {
        goToFirstPage();
        return;
      }

      // Last page
      if (input === 'G') {
        goToLastPage(displayItems.length);
        return;
      }

      // Enter: DIR/LINK -> navigate, FILE -> toggle selection
      if (key.return) {
        if (!selectedItem) return;
        if (selectedItem.type === 'DIR' || selectedItem.type === 'LINK') {
          nav.handleEnter(selectedItem);
        } else if (selectedItem.type === 'FILE') {
          toggleCheck(globalIndex);
        }
        return;
      }

      // Space: toggle selection on current item
      if (input === ' ') {
        if (selectedItem) {
          toggleCheck(globalIndex);
        }
        return;
      }

      // Download selected items (or current item if none selected)
      if (input === 'd') {
        if (checkedItems.size > 0) {
          const indices = Array.from(checkedItems).sort((a, b) => a - b);
          const items = indices.map((i) => displayItems[i]).filter(Boolean);
          // Each search result carries its own path; use per-item path
          for (const item of items) {
            const base = item.path ?? currentPath;
            if (item.type === 'FILE') dl.addFileDownload(item, base);
            else if (item.type === 'DIR') dl.addDirectoryDownload(item, base, true);
          }
          clearChecked();
        } else if (selectedItem) {
          const remoteBase = selectedItem.path ?? currentPath;
          if (selectedItem.type === 'FILE') {
            dl.addFileDownload(selectedItem, remoteBase);
          } else if (selectedItem.type === 'DIR') {
            dl.addDirectoryDownload(selectedItem, remoteBase, true);
          }
        }
        return;
      }

      // Preview
      if (input === 'p' && selectedItem?.type === 'FILE') {
        onPreview(selectedItem);
        return;
      }

      // Search
      if (input === '/') {
        setMode('search');
        setSearchQuery('');
        return;
      }

      // Refresh
      if (input === 'r') {
        listDirectory(currentPath).catch(() => {});
        return;
      }

      // Select all / Deselect all
      if (input === 'a') {
        checkAll(displayItems.length);
        return;
      }

      // Quick cursor move (1-9): move cursor only, no auto-enter
      if (input >= '1' && input <= '9') {
        const num = parseInt(input, 10) - 1;
        const targetGlobal = currentPage * itemsPerPage + num;
        if (targetGlobal < displayItems.length) {
          moveCursor(targetGlobal);
        }
        return;
      }
    },
    [
      loading,
      globalIndex,
      displayItems,
      itemsPerPage,
      currentPage,
      currentPath,
      selectedItem,
      checkedItems,
      setMode,
      setCurrentPage,
      setSelectedIndex,
      setSearchQuery,
      toggleCheck,
      clearChecked,
      checkAll,
      moveCursor,
      prevPage,
      nextPage,
      goToFirstPage,
      goToLastPage,
      listDirectory,
      nav,
      dl,
      onPreview,
      exit,
    ]
  );

  useInput((input, key) => {
    if (mode === 'help' || mode === 'preview') {
      if (input === 'q' || key.escape || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
        setMode('browse');
      }
      return;
    }
    if (mode === 'search') {
      // Escape: clear checked -> exit search
      if (key.escape) {
        if (checkedItems.size > 0) {
          clearChecked();
        } else {
          setMode('browse');
          setSearchQuery('');
        }
        return;
      }
      // Tab: toggle input focus
      if (key.tab) {
        setSearchInputFocused(!searchInputFocused);
        return;
      }
      // Navigate mode (TextInput deactivated)
      if (!searchInputFocused) {
        // Block keys that conflict with search
        if (input === '/' || input === 'r') return;
        if (key.return) {
          if (!selectedItem) return;
          if (selectedItem.type === 'DIR' || selectedItem.type === 'LINK') {
            setMode('browse');
            setSearchQuery('');
            nav.handleEnter(selectedItem);
          } else if (selectedItem.type === 'FILE') {
            toggleCheck(globalIndex);
          }
          return;
        }
        handleBrowse(input, key);
        return;
      }
      // Input mode (TextInput active) — arrow keys auto-switch to navigate
      if (key.upArrow || key.downArrow || key.pageUp || key.pageDown) {
        setSearchInputFocused(false);
        handleBrowse(input, key);
        return;
      }
      if (key.return) {
        if (!selectedItem) return;
        if (selectedItem.type === 'DIR' || selectedItem.type === 'LINK') {
          setMode('browse');
          setSearchQuery('');
          nav.handleEnter(selectedItem);
        } else if (selectedItem.type === 'FILE') {
          toggleCheck(globalIndex);
        }
        return;
      }
      return; // TextInput captures remaining keys
    }
    if (mode === 'connecting') return;
    if (mode === 'browse') {
      handleBrowse(input, key);
    }
  });
}
