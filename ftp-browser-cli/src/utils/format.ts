import type { FormatSizeFunction } from '../types/index.js';

/**
 * Formats file size in bytes to human-readable string.
 * @param size - File size in bytes, or null if unknown
 * @returns Formatted string (e.g., "1.5 MB")
 */
export const formatFileSize: FormatSizeFunction = (size: number | null): string => {
  if (size === null || size === undefined) {
    return 'N/A';
  }

  if (size < 1024) {
    return `${size}B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  } else if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
};

/**
 * Formats date string to readable format.
 * @param date - Date string or null
 * @returns Formatted date string
 */
export const formatDate = (date: string | null): string => {
  if (!date) {
    return 'N/A';
  }
  return date;
};

/**
 * Formats path string (truncates if too long).
 * @param path - Path string
 * @param maxLength - Maximum length (default: 60)
 * @returns Formatted path string
 */
export const formatPath = (path: string, maxLength: number = 60): string => {
  if (path.length <= maxLength) {
    return path;
  }
  return `...${path.slice(-(maxLength - 3))}`;
};

/**
 * Formats time in seconds to human-readable string.
 * @param seconds - Time in seconds
 * @returns Formatted string (e.g., "2m 30s")
 */
export const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

/**
 * Formats speed in bytes per second to human-readable string.
 * @param bytesPerSecond - Speed in bytes per second
 * @returns Formatted string (e.g., "1.2 MB/s")
 */
export const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatFileSize(bytesPerSecond)}/s`;
};
