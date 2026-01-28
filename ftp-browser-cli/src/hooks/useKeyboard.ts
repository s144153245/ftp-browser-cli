/**
 * Central keyboard handler: shortcuts from SHARED_CONSTANTS, mode-specific behavior.
 */

import { useInput } from 'ink';
import { useCallback } from 'react';
import { useFTPStore } from '../store/ftpSlice.js';
import { useUIStore } from '../store/uiSlice.js';
import { useNavigation } from './useNavigation.js';
import { useSearch } from './useSearch.js';
import { useDownload } from './useDownload.js';
import type { AppMode, FileItem } from '../types/index.js';

export function useKeyboard(opts: {
  downloadDir: string;
  onPreview: (item: FileItem) => void;
  onInfo: (item: FileItem) => void;
  onShowModal: (item: FileItem) => void;
  exit: () => void;
}) {
  const { downloadDir, onPreview, onInfo, onShowModal, exit } = opts;
  const nav = useNavigation();
  const search = useSearch();
  const dl = useDownload(downloadDir);

  const mode = useUIStore((s) => s.mode);
  const setMode = useUIStore((s) => s.setMode);
  const setSelectedIndex = useUIStore((s) => s.setSelectedIndex);
  const setCurrentPage = useUIStore((s) => s.setCurrentPage);
  const selectedIndex = useUIStore((s) => s.selectedIndex);
  const currentPage = useUIStore((s) => s.currentPage);
  const itemsPerPage = useUIStore((s) => s.itemsPerPage);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);

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

  const handleBrowse = useCallback(
    (input: string, key: { upArrow?: boolean; downArrow?: boolean; return?: boolean; backspace?: boolean; pageUp?: boolean; pageDown?: boolean; escape?: boolean; ctrl?: boolean }) => {
      if (loading) return;

      if (input === 'q' || key.escape) {
        exit();
        return;
      }
      if (input === '?' || input === 'h') {
        setMode('help');
        return;
      }
      if (key.upArrow || input === 'k') {
        if (globalIndex > 0) {
          const next = globalIndex - 1;
          const page = Math.floor(next / itemsPerPage);
          const idx = next % itemsPerPage;
          setCurrentPage(page);
          setSelectedIndex(idx);
        }
        return;
      }
      if (key.downArrow || input === 'j') {
        if (globalIndex < displayItems.length - 1) {
          const next = globalIndex + 1;
          const page = Math.floor(next / itemsPerPage);
          const idx = next % itemsPerPage;
          setCurrentPage(page);
          setSelectedIndex(idx);
        }
        return;
      }
      if (key.pageUp) {
        prevPage();
        return;
      }
      if (input === 'n' || key.pageDown) {
        nextPage(displayItems.length);
        return;
      }
      if (input === 'g') {
        goToFirstPage();
        return;
      }
      if (input === 'G') {
        goToLastPage(displayItems.length);
        return;
      }
      if (key.backspace || input === 'b') {
        nav.handleGoBack();
        return;
      }
      if (key.return) {
        if (selectedItem) {
          if (selectedItem.type === 'FILE') {
            onShowModal(selectedItem);
          } else {
            nav.handleEnter(selectedItem);
          }
        }
        return;
      }
      if (input === '/') {
        setMode('search');
        setSearchQuery('');
        return;
      }
      if (input === 'r') {
        listDirectory(currentPath).catch(() => {});
        return;
      }
      if (input === 'd' && selectedItem) {
        if (selectedItem.type === 'FILE') {
          dl.addFileDownload(selectedItem, currentPath);
        } else if (selectedItem.type === 'DIR') {
          dl.addDirectoryDownload(selectedItem, currentPath, true);
        }
        return;
      }
      if (input === 'p' && selectedItem?.type === 'FILE') {
        onPreview(selectedItem);
        return;
      }
      if (input === 'i' && selectedItem) {
        onInfo(selectedItem);
        return;
      }
      if (input >= '1' && input <= '9') {
        const num = parseInt(input, 10) - 1;
        const idx = currentPage * itemsPerPage + num;
        if (idx < displayItems.length) {
          const page = Math.floor(idx / itemsPerPage);
          const local = idx % itemsPerPage;
          setCurrentPage(page);
          setSelectedIndex(local);
          const it = displayItems[idx];
          if (it && (it.type === 'DIR' || it.type === 'LINK')) {
            nav.handleEnter(it);
          } else if (it?.type === 'FILE') {
            onShowModal(it);
          }
        }
      }
    },
    [
      loading,
      globalIndex,
      displayItems,
      itemsPerPage,
      currentPage,
      selectedItem,
      currentPath,
      setMode,
      setCurrentPage,
      setSelectedIndex,
      setSearchQuery,
      prevPage,
      nextPage,
      goToFirstPage,
      goToLastPage,
      listDirectory,
      nav,
      dl,
      onPreview,
      onInfo,
      onShowModal,
      exit,
    ]
  );

  useInput((input, key) => {
    if (mode === 'help' || mode === 'preview') {
      if (input === 'q' || key.escape) {
        setMode('browse');
      }
      return;
    }
    if (mode === 'search') {
      if (key.escape) {
        search.cancelSearch();
        setMode('browse');
        setSearchQuery('');
      }
      return;
    }
    if (mode === 'connecting') return;
    if (mode === 'browse') {
      handleBrowse(input, key);
    }
  });
}
