import type { FileItem, IFileParser } from '../types/index.js';
import { patterns } from '../utils/constants.js';

/**
 * File Parser Service
 * Parses FTP LIST output into FileItem objects
 */
export class FileParser implements IFileParser {
  /**
   * Parses complete LIST output string
   * @param output - Raw LIST output from FTP server
   * @returns Array of parsed FileItem objects
   */
  parseListOutput(output: string): FileItem[] {
    const lines = output.split('\n').filter(line => line.trim().length > 0);
    const items: FileItem[] = [];

    for (const line of lines) {
      const item = this.parseUnixList(line) || this.parseWindowsList(line);
      if (item) {
        items.push(item);
      }
    }

    // Sort: directories first, then files (alphabetical)
    return items.sort((a, b) => {
      if (a.type === 'DIR' && b.type !== 'DIR') return -1;
      if (a.type !== 'DIR' && b.type === 'DIR') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Parses Unix-style LIST output line
   * Format: drwxr-xr-x 2 user group 4096 Jan 28 10:30 filename
   * @param line - Single line from LIST output
   * @returns Parsed FileItem or null if unparseable
   */
  parseUnixList(line: string): FileItem | null {
    const match = line.match(patterns.unixList);
    if (!match) {
      return null;
    }

    const [, typeChar, permissions, , , sizeStr, dateStr, namePart] = match;

    // Determine file type
    let type: FileItem['type'] = 'FILE';
    if (typeChar === 'd') {
      type = 'DIR';
    } else if (typeChar === 'l') {
      type = 'LINK';
    }

    // Parse size
    const size = sizeStr ? parseInt(sizeStr, 10) : null;

    // Parse date (format: "Jan 28 10:30" or "Jan 28 2024")
    const date = this.parseUnixDate(dateStr);

    // Parse name and symlink target
    let name = namePart.trim();
    let target: string | undefined;

    // Check for symlink target (filename -> target)
    const symlinkMatch = name.match(patterns.symlink);
    if (symlinkMatch) {
      name = symlinkMatch[1].trim();
      target = symlinkMatch[2].trim();
    }

    // Handle filenames with spaces (everything after date is the filename)
    // The regex already captures the full filename, but we need to handle edge cases
    if (name.length === 0) {
      return null;
    }

    return {
      type,
      name,
      size: type === 'DIR' ? null : size,
      date,
      target,
      permissions: typeChar + permissions,
    };
  }

  /**
   * Parses Windows-style LIST output line
   * Format: 01-28-24 10:30AM <DIR> folder or 01-28-24 10:30AM 12345 file.txt
   * @param line - Single line from LIST output
   * @returns Parsed FileItem or null if unparseable
   */
  parseWindowsList(line: string): FileItem | null {
    const match = line.match(patterns.windowsList);
    if (!match) {
      return null;
    }

    const [, dateStr, timeStr, dirOrSize, namePart] = match;

    // Determine file type
    let type: FileItem['type'] = 'FILE';
    let size: number | null = null;

    if (dirOrSize === '<DIR>') {
      type = 'DIR';
    } else {
      size = parseInt(dirOrSize, 10);
      if (isNaN(size)) {
        size = null;
      }
    }

    // Parse date (format: "01-28-24" or "01-28-2024")
    const date = this.parseWindowsDate(dateStr, timeStr);

    // Parse name
    const name = namePart.trim();
    if (name.length === 0) {
      return null;
    }

    return {
      type,
      name,
      size: type === 'DIR' ? null : size,
      date,
    };
  }

  /**
   * Parses Unix-style date string
   * Formats: "Jan 28 10:30", "Jan 28 2024", "Jan 28 10:30:45"
   * @param dateStr - Date string from LIST output
   * @returns ISO date string or null
   */
  private parseUnixDate(dateStr: string): string | null {
    if (!dateStr) {
      return null;
    }

    try {
      const parts = dateStr.trim().split(/\s+/);
      if (parts.length < 3) {
        return null;
      }

      const month = parts[0];
      const day = parseInt(parts[1], 10);
      const timeOrYear = parts[2];

      const monthMap: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };

      const monthNum = monthMap[month];
      if (monthNum === undefined) {
        return null;
      }

      const now = new Date();
      let year: number;
      let hours = 0;
      let minutes = 0;

      // Check if third part is a year or time
      if (timeOrYear.includes(':')) {
        // It's a time (current year)
        year = now.getFullYear();
        const [h, m] = timeOrYear.split(':');
        hours = parseInt(h, 10);
        minutes = parseInt(m, 10);
      } else {
        // It's a year
        year = parseInt(timeOrYear, 10);
        // If year is 2 digits, assume 20xx
        if (year < 100) {
          year += 2000;
        }
      }

      const date = new Date(year, monthNum, day, hours, minutes);
      return date.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * Parses Windows-style date string
   * Format: "01-28-24 10:30AM" or "01-28-2024 10:30AM"
   * @param dateStr - Date string (MM-DD-YY or MM-DD-YYYY)
   * @param timeStr - Time string (HH:MMAM/PM)
   * @returns ISO date string or null
   */
  private parseWindowsDate(dateStr: string, timeStr: string): string | null {
    if (!dateStr || !timeStr) {
      return null;
    }

    try {
      const [month, day, year] = dateStr.split('-').map(s => parseInt(s, 10));
      if (isNaN(month) || isNaN(day) || isNaN(year)) {
        return null;
      }

      // Normalize year (2-digit to 4-digit)
      const fullYear = year < 100 ? 2000 + year : year;

      // Parse time
      const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
      if (!timeMatch) {
        return null;
      }

      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toUpperCase();

      if (ampm === 'PM' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
      }

      const date = new Date(fullYear, month - 1, day, hours, minutes);
      return date.toISOString();
    } catch {
      return null;
    }
  }
}

/**
 * Creates a new FileParser instance
 */
export function createFileParser(): FileParser {
  return new FileParser();
}
