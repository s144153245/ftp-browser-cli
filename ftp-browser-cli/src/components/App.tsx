import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { FTPService, createFTPService } from '../services/ftpClient.js';
import type { FileItem, FTPConfig, AppMode, DownloadProgress } from '../types/index.js';

const COLORS = {
  primary: 'cyan', success: 'green', warning: 'yellow', error: 'red',
  muted: 'gray', directory: 'green', file: 'white', symlink: 'magenta', border: 'blue',
} as const;

const ICONS = { directory: '📁', file: '📄', symlink: '🔗' } as const;

interface AppProps {
  config: FTPConfig;
  downloadDir: string;
}

export const App: React.FC<AppProps> = ({ config, downloadDir }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  
  const [ftp] = useState(() => createFTPService(config));
  const [mode, setMode] = useState<AppMode>('connecting');
  const [connected, setConnected] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const terminalHeight = stdout?.rows || 24;
  const pageSize = Math.max(5, terminalHeight - 10);
  const totalPages = Math.ceil(files.length / pageSize);

  useEffect(() => {
    const connect = async () => {
      setIsLoading(true);
      setMessage('Connecting to FTP server...');
      try {
        await ftp.connect();
        setConnected(true);
        setMode('browse');
        await loadDirectory('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
        setMode('browse'); // Error state handled via error message
      } finally {
        setIsLoading(false);
        setMessage(null);
      }
    };
    connect();
    return () => { ftp.disconnect(); };
  }, []);

  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setMessage(`Loading ${path}...`);
    setError(null);
    try {
      const items = await ftp.list(path);
      setFiles(items);
      setCurrentPath(path);
      setSelectedIndex(0);
      setPageIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setIsLoading(false);
      setMessage(null);
    }
  }, [ftp]);

  const navigateToSelected = useCallback(async () => {
    const selected = files[selectedIndex];
    if (!selected) return;

    if (selected.type === 'DIR' || selected.type === 'LINK') {
      const newPath = currentPath === '/' ? `/${selected.name}` : `${currentPath}/${selected.name}`;
      await loadDirectory(newPath);
    } else {
      setMessage(`Downloading ${selected.name}...`);
      try {
        const remotePath = currentPath === '/' ? `/${selected.name}` : `${currentPath}/${selected.name}`;
        const localPath = `${downloadDir}/${selected.name}`;
        await ftp.download(remotePath, localPath, (p) => {
          const percentage = p.totalSize > 0 ? (p.downloaded / p.totalSize) * 100 : 0;
          setMessage(`Downloading ${selected.name}: ${percentage.toFixed(1)}%`);
        });
        setMessage(`✅ Downloaded: ${selected.name}`);
        setTimeout(() => setMessage(null), 3000);
      } catch (err) {
        setError(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }, [files, selectedIndex, currentPath, downloadDir, ftp, loadDirectory]);

  const goBack = useCallback(async () => {
    if (currentPath === '/') return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    await loadDirectory(parentPath);
  }, [currentPath, loadDirectory]);

  useInput((input: string, key: any) => {
    if (mode === 'help') { setMode('browse'); return; }
    if (isLoading) return;

    if (input === 'q' || (key.ctrl && input === 'c')) { ftp.disconnect(); exit(); return; }
    if (input === '?' || input === 'h') { setMode('help'); return; }
    if (key.upArrow || input === 'k') {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
      if (selectedIndex - 1 < pageIndex * pageSize) setPageIndex(Math.max(0, pageIndex - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex(Math.min(files.length - 1, selectedIndex + 1));
      if (selectedIndex + 1 >= (pageIndex + 1) * pageSize) setPageIndex(Math.min(totalPages - 1, pageIndex + 1));
      return;
    }
    if (input === 'n' || key.pageDown) {
      setPageIndex(Math.min(totalPages - 1, pageIndex + 1));
      setSelectedIndex(Math.min(files.length - 1, (pageIndex + 1) * pageSize));
      return;
    }
    if (input === 'p' || key.pageUp) {
      setPageIndex(Math.max(0, pageIndex - 1));
      setSelectedIndex(Math.max(0, (pageIndex - 1) * pageSize));
      return;
    }
    if (key.return) { navigateToSelected(); return; }
    if (input === 'b' || key.backspace) { goBack(); return; }
    if (input === 'r') { loadDirectory(currentPath); return; }
    if (/^[1-9]$/.test(input)) {
      const index = parseInt(input, 10) - 1 + pageIndex * pageSize;
      if (index < files.length) setSelectedIndex(index);
      return;
    }
  });

  const formatSize = (size: number | null): string => {
    if (size === null) return '    -   ';
    if (size < 1024) return `${size.toString().padStart(6)}B `;
    if (size < 1048576) return `${(size / 1024).toFixed(1).padStart(6)}KB`;
    if (size < 1073741824) return `${(size / 1048576).toFixed(1).padStart(6)}MB`;
    return `${(size / 1073741824).toFixed(1).padStart(6)}GB`;
  };

  const startIndex = pageIndex * pageSize;
  const visibleFiles = files.slice(startIndex, startIndex + pageSize);
  const numWidth = String(files.length).length;

  if (mode === 'help') {
    return (
      <Box flexDirection="column" borderStyle="double" borderColor="cyan" padding={1}>
        <Text bold color="cyan">Keyboard Shortcuts</Text>
        <Text />
        <Text><Text color="cyan">↑/k</Text>     Move up</Text>
        <Text><Text color="cyan">↓/j</Text>     Move down</Text>
        <Text><Text color="cyan">Enter</Text>   Open directory / Download file</Text>
        <Text><Text color="cyan">b</Text>       Go back</Text>
        <Text><Text color="cyan">r</Text>       Refresh</Text>
        <Text><Text color="cyan">n/p</Text>     Next/Previous page</Text>
        <Text><Text color="cyan">?</Text>       Show this help</Text>
        <Text><Text color="cyan">q</Text>       Quit</Text>
        <Text />
        <Text color="gray">Press any key to close</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%">
      <Box borderStyle="single" borderColor="blue" paddingX={1}>
        <Text bold color="cyan">FTP_Browser-CLI - {config.host}</Text>
        <Box flexGrow={1} />
        <Text color={connected ? 'green' : 'red'}>{connected ? '● Connected' : '○ Disconnected'}</Text>
      </Box>
      
      <Box paddingX={1}>
        <Text color="cyan">📍 </Text>
        <Text color="gray">{currentPath}</Text>
      </Box>

      {isLoading && message && (
        <Box paddingX={1} paddingY={1}>
          <Text color="cyan"><Spinner type="dots" /></Text>
          <Text color="gray"> {message}</Text>
        </Box>
      )}
      
      {error && (
        <Box paddingX={1} paddingY={1}>
          <Text color="red">❌ Error: {error}</Text>
        </Box>
      )}
      
      {!isLoading && !error && mode === 'browse' && (
        <Box flexDirection="column" paddingX={1}>
          {files.length === 0 ? (
            <Text color="yellow">(Empty directory)</Text>
          ) : (
            visibleFiles.map((file, i) => {
              const actualIndex = startIndex + i;
              const isSelected = actualIndex === selectedIndex;
              const icon = file.type === 'DIR' ? ICONS.directory : file.type === 'LINK' ? ICONS.symlink : ICONS.file;
              const color = file.type === 'DIR' ? 'green' : file.type === 'LINK' ? 'magenta' : 'white';
              const displayName = file.type === 'DIR' ? `${file.name}/` : file.name;
              
              return (
                <Box key={`${file.name}-${i}`}>
                  <Text color={isSelected ? 'cyan' : 'gray'}>{isSelected ? '▸' : ' '}</Text>
                  <Text color="cyan">[{String(actualIndex + 1).padStart(numWidth)}]</Text>
                  <Text> {icon} </Text>
                  <Text bold color={color}>{file.type.padEnd(4)}</Text>
                  <Text color={color}> {displayName}</Text>
                  {file.type === 'LINK' && file.target && <Text color="gray"> → {file.target}</Text>}
                  {file.type === 'FILE' && (
                    <>
                      <Box flexGrow={1} />
                      <Text color="gray">({formatSize(file.size)})</Text>
                    </>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      )}

      {message && !isLoading && (
        <Box paddingX={1}>
          <Text color="green">{message}</Text>
        </Box>
      )}
      
      <Box borderStyle="single" borderColor="blue" paddingX={1} justifyContent="space-between">
        <Box>
          {totalPages > 1 && <Text color="gray">Page {pageIndex + 1}/{totalPages} ({files.length} items)</Text>}
        </Box>
        <Box>
          <Text color="cyan">[↑↓]</Text><Text color="gray">Nav </Text>
          <Text color="cyan">[Enter]</Text><Text color="gray">Open </Text>
          <Text color="cyan">[b]</Text><Text color="gray">Back </Text>
          <Text color="cyan">[?]</Text><Text color="gray">Help </Text>
          <Text color="cyan">[q]</Text><Text color="gray">Quit</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default App;
