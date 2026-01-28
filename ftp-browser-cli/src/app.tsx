/**
 * Root app: FTP lifecycle (connect on mount, disconnect on unmount), render UI.
 */

import React, { useEffect } from 'react';
import { useFtp } from './hooks/useFtp.js';
import { App } from './components/App.js';
import type { FTPConfig } from './types/index.js';

export interface RootAppProps {
  config: FTPConfig;
  downloadDir: string;
}

export function RootApp({ config, downloadDir }: RootAppProps): React.ReactElement {
  useFtp(config);

  return <App config={config} downloadDir={downloadDir} />;
}

export default RootApp;
