/**
 * Main App UI: mode-based routing, stores, hooks.
 */

import React, { useEffect, useState, useCallback } from 'react';
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
import { Modal } from './Modal.js';
import { colors, icons, defaults } from '../utils/constants.js';
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

  const files = useFTPStore((s) => s.files);
  const currentPath = useFTPStore((s) => s.currentPath);
  const loading = useFTPStore((s) => s.loading);
  const error = useFTPStore((s) => s.error);
  const connected = useFTPStore((s) => s.connected);

  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    options?: string[];
    onSelect: (o: string) => void;
    onCancel: () => void;
  } | null>(null);

  const nav = useNavigation();
  const search = useSearch();
  const dl = useDownload(downloadDir);

  useEffect(() => {
    setMode('connecting');
  }, []);

  useEffect(() => {
    if (mode === 'connecting' && !loading && (connected || !!error)) {
      setMode('browse');
    }
  }, [mode, loading, connected, error, setMode]);

  const displayItems = mode === 'search' ? searchResults : files;
  const totalPages = Math.max(1, Math.ceil(displayItems.length / itemsPerPage));
  const globalIndex = currentPage * itemsPerPage + selectedIndex;

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

  const handleInfo = useCallback(
    async (item: FileItem) => {
      const remote = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      const ftp = getFtpService();
      if (!ftp) return;
      try {
        const info = await ftp.getFileInfo(remote);
        setModal({
          title: `Info: ${item.name}`,
          message: `Type: ${info.type} | Size: ${info.size ?? 'N/A'} | Date: ${info.date ?? 'N/A'}`,
          options: [],
          onSelect: () => setModal(null),
          onCancel: () => setModal(null),
        });
      } catch {
        setModal({
          title: `Info: ${item.name}`,
          message: 'Failed to fetch file info.',
          options: [],
          onSelect: () => setModal(null),
          onCancel: () => setModal(null),
        });
      }
    },
    [currentPath]
  );

  const handleShowModal = useCallback(
    (item: FileItem) => {
      setModal({
        title: `File: ${item.name}`,
        message: `Select an action for ${item.name}:`,
        options: ['Download', 'Preview', 'Info'],
        onSelect: (opt) => {
          setModal(null);
          if (opt === 'Download') {
            dl.addFileDownload(item, currentPath);
          } else if (opt === 'Preview') {
            handlePreview(item);
          } else if (opt === 'Info') {
            handleInfo(item);
          }
        },
        onCancel: () => setModal(null),
      });
    },
    [currentPath, dl, handlePreview, handleInfo]
  );

  useKeyboard({
    downloadDir,
    onPreview: handlePreview,
    onInfo: handleInfo,
    onShowModal: handleShowModal,
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
            if (item.type === 'FILE') handleShowModal(item);
            else nav.handleEnter(item);
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
          {downloads.map((d) => (
            <ProgressBar
              key={d.id}
              progress={d}
              onCancel={() => dl.cancelDownload(d.id)}
            />
          ))}
        </Box>
      )}

      <Box height={1} />
      <StatusBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={displayItems.length}
        mode={mode}
      />

      {modal && (
        <Modal
          title={modal.title}
          message={modal.message}
          options={modal.options}
          onSelect={modal.onSelect}
          onCancel={modal.onCancel}
        />
      )}
    </Box>
  );
};
