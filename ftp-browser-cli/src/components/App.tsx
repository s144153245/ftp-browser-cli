/**
 * Main App UI: mode-based routing, stores, hooks.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import type { AppProps, FileItem } from '../types/index.js';
import { Header } from './Header.js';
import { Breadcrumb } from './Breadcrumb.js';
import { FileList } from './FileList.js';
import { StatusBar } from './StatusBar.js';
import { SearchBox } from './SearchBox.js';
import { Preview } from './Preview.js';
import { HelpPanel } from './HelpPanel.js';
import { ProgressBar } from './ProgressBar.js';
import { InfoPanel } from './InfoPanel.js';
import { colors, icons, defaults, getTerminalWidth } from '../utils/constants.js';
import { useFTPStore } from '../store/ftpSlice.js';
import { useUIStore } from '../store/uiSlice.js';
import { useKeyboard, useNavigation, useSearch, useDownload } from '../hooks/index.js';
import { getFtpService } from '../store/ftpSlice.js';

export const App: React.FC<AppProps> = ({ config, downloadDir }) => {
  const { exit } = useApp();

  const mode = useUIStore((s) => s.mode);
  const setMode = useUIStore((s) => s.setMode);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const searchResults = useUIStore((s) => s.searchResults);
  const isSearching = useUIStore((s) => s.isSearching);
  const selectedIndex = useUIStore((s) => s.selectedIndex);
  const currentPage = useUIStore((s) => s.currentPage);
  const itemsPerPage = useUIStore((s) => s.itemsPerPage);
  const downloads = useUIStore((s) => s.downloads);
  const setCurrentPage = useUIStore((s) => s.setCurrentPage);
  const setSelectedIndex = useUIStore((s) => s.setSelectedIndex);
  const removeDownload = useUIStore((s) => s.removeDownload);
  const clearChecked = useUIStore((s) => s.clearChecked);

  const files = useFTPStore((s) => s.files);
  const currentPath = useFTPStore((s) => s.currentPath);
  const loading = useFTPStore((s) => s.loading);
  const error = useFTPStore((s) => s.error);
  const connected = useFTPStore((s) => s.connected);
  const clearError = useFTPStore((s) => s.clearError);

  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState('');

  const nav = useNavigation();
  const search = useSearch();
  const dl = useDownload(downloadDir);

  // Track previous path to clear selection on navigation
  const prevPathRef = useRef(currentPath);
  useEffect(() => {
    if (prevPathRef.current !== currentPath) {
      clearChecked();
      prevPathRef.current = currentPath;
    }
  }, [currentPath, clearChecked]);

  useEffect(() => {
    setMode('connecting');
  }, []);

  useEffect(() => {
    if (mode === 'connecting' && !loading && (connected || !!error)) {
      setMode('browse');
    }
  }, [mode, loading, connected, error, setMode]);

  // Auto-remove completed/failed downloads after 5 seconds
  useEffect(() => {
    const completed = downloads.filter(
      (d) => d.status === 'completed' || d.status === 'failed'
    );
    if (completed.length === 0) return;
    const timer = setTimeout(() => {
      completed.forEach((d) => removeDownload(d.id));
    }, 3000);
    return () => clearTimeout(timer);
  }, [downloads, removeDownload]);

  // Auto-clear error after 8 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => clearError(), 8000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  const displayItems = mode === 'search' ? searchResults : files;
  const totalPages = Math.max(1, Math.ceil(displayItems.length / itemsPerPage));
  const globalIndex = currentPage * itemsPerPage + selectedIndex;
  const selectedItem = displayItems[globalIndex] ?? null;

  const handlePreview = useCallback(
    async (item: FileItem) => {
      if (item.type !== 'FILE') return;
      const remote = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      const ftp = getFtpService();
      if (!ftp) return;
      try {
        const content = await ftp.preview(remote, defaults.maxPreviewBytes);
        setPreviewPath(item.name);
        setPreviewContent(content);
        setMode('preview');
      } catch {
        setPreviewContent(`Failed to preview ${item.name}`);
        setPreviewPath(item.name);
        setMode('preview');
      }
    },
    [currentPath, setMode]
  );

  useKeyboard({
    downloadDir,
    onPreview: handlePreview,
    exit,
  });

  const onSearchQuery = useCallback(
    (q: string) => {
      setSearchQuery(q);
      search.runSearchDebounced(q);
    },
    [setSearchQuery, search]
  );

  const onSearchCancel = useCallback(() => {
    search.cancelSearch();
    setMode('browse');
    setSearchQuery('');
  }, [search, setMode, setSearchQuery]);

  return (
    <Box flexDirection="column">
      <Header host={config.host} />
      <Box height={1} />
      <Breadcrumb path={currentPath} />
      <Box height={1} />

      {loading && mode === 'connecting' && (
        <Box>
          <Text>
            <Spinner type="dots" /> {colors.info('Connecting...')}
          </Text>
        </Box>
      )}

      {error && (
        <Box>
          <Text>
            {icons.error} {colors.error(error)}
          </Text>
        </Box>
      )}

      {mode === 'browse' && !loading && (
        <FileList
          items={displayItems}
          selectedIndex={globalIndex}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onSelect={(idx) => {
            const p = Math.floor(idx / itemsPerPage);
            const i = idx % itemsPerPage;
            setCurrentPage(p);
            setSelectedIndex(i);
          }}
          onEnter={(item) => {
            if (item.type === 'DIR' || item.type === 'LINK') {
              nav.handleEnter(item);
            }
          }}
        />
      )}

      {mode === 'search' && (
        <Box flexDirection="column">
          <SearchBox
            isActive
            query={searchQuery}
            onSearch={onSearchQuery}
            onCancel={onSearchCancel}
            isSearching={isSearching}
          />
          {searchResults.length > 0 && (
            <FileList
              items={searchResults}
              selectedIndex={globalIndex}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onSelect={(idx) => {
                const p = Math.floor(idx / itemsPerPage);
                const i = idx % itemsPerPage;
                setCurrentPage(p);
                setSelectedIndex(i);
              }}
              onEnter={(item) => {
                if (item.type === 'FILE') handlePreview(item);
                else nav.handleEnter(item);
              }}
            />
          )}
        </Box>
      )}

      {mode === 'preview' && previewPath && (
        <Preview
          filePath={previewPath}
          content={previewContent}
          onClose={() => {
            setMode('browse');
            setPreviewPath(null);
            setPreviewContent('');
          }}
        />
      )}

      {mode === 'help' && <HelpPanel onClose={() => setMode('browse')} />}

      {downloads.length > 0 && (
        <Box flexDirection="column">
          <Text>
            {colors.muted(
              `── Downloads ${
                '─'.repeat(Math.max(1, getTerminalWidth() - 16))
              }`
            )}
          </Text>
          {downloads.map((d) => (
            <ProgressBar key={d.id} progress={d} />
          ))}
        </Box>
      )}

      {(mode === 'browse' || mode === 'search') ? (
        <InfoPanel item={selectedItem} currentPath={currentPath} />
      ) : (
        <Box height={1} />
      )}
      <StatusBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={displayItems.length}
        mode={mode}
      />
    </Box>
  );
};
