/**
 * FTP connection lifecycle: connect on mount, disconnect on unmount.
 */

import { useEffect } from 'react';
import { useFTPStore } from '../store/index.js';
import type { FTPConfig } from '../types/index.js';

export function useFtp(config: FTPConfig | null): void {
  const connect = useFTPStore((s) => s.connect);
  const disconnect = useFTPStore((s) => s.disconnect);

  useEffect(() => {
    if (!config) return;
    connect(config).catch(() => {});
    return () => {
      disconnect().catch(() => {});
    };
  }, [config?.host, config?.port, config?.user]);
}
