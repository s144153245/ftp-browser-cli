import { defaults } from './constants.js';

/**
 * Formats file size in bytes to human-readable string.
 * @param size - File size in bytes, or null if unknown
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(size: number | null): string {
  if (size === null) {
    return '    -   ';
  }
  
  if (size < 1024) {
    return `${size.toString().padStart(6)}B `;
  }
  
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1).padStart(6)}KB`;
  }
  
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1).padStart(6)}MB`;
  }
  
  return `${(size / (1024 * 1024 * 1024)).toFixed(1).padStart(6)}GB`;
}

/**
 * Formats date string to human-readable format.
 * @param date - Date string, or null if unknown
 * @returns Formatted date string
 */
export function formatDate(date: string | null): string {
  if (date === null) {
    return '    -   ';
  }
  
  try {
    // Try to parse the date string
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return date; // Return original if parsing fails
    }
    
    // Format as YYYY-MM-DD HH:mm
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const hours = String(parsedDate.getHours()).padStart(2, '0');
    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return date; // Return original if any error occurs
  }
}

/**
 * Truncates text with ellipsis if it exceeds max length.
 * @param text - Text to truncate
 * @param maxLen - Maximum length
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Gets terminal width with min/max constraints.
 * @returns Terminal width (min 60, max 100)
 */
export function getTerminalWidth(): number {
  const width = process.stdout.columns || defaults.minTerminalWidth;
  
  if (width < defaults.minTerminalWidth) {
    return defaults.minTerminalWidth;
  }
  
  if (width > defaults.maxTerminalWidth) {
    return defaults.maxTerminalWidth;
  }
  
  return width;
}
