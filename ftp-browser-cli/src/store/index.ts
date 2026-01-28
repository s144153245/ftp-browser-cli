import { useFTPStore } from './ftpSlice.js';
import { useUIStore } from './uiSlice.js';

// Export individual stores
export { useFTPStore } from './ftpSlice.js';
export { useUIStore } from './uiSlice.js';

/**
 * Combined hook for accessing both stores
 * Useful when components need state from both slices
 */
export const useAppState = () => {
  const ftp = useFTPStore();
  const ui = useUIStore();
  return { ftp, ui };
};
