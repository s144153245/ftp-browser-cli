/**
 * Parses FTP LIST output into FileItem objects.
 */

import type { FileItem, IFileParser } from '../types/index.js';
import { patterns } from '../utils/constants.js';

export class FileParser implements IFileParser {
  parseListOutput(output: string): FileItem[] {
    const lines = output.split('\n').filter((line) => line.trim().length > 0);
    const items: FileItem[] = [];
    for (const line of lines) {
      const item = this.parseUnixList(line) ?? this.parseWindowsList(line);
      if (item) items.push(item);
    }
    return items.sort((a, b) => {
      if (a.type === 'DIR' && b.type !== 'DIR') return -1;
      if (a.type !== 'DIR' && b.type === 'DIR') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  parseUnixList(line: string): FileItem | null {
    const match = line.match(patterns.unixList);
    if (!match) return null;
    const [, typeChar, perms, sizeStr, dateStr, namePart] = match;
    let type: FileItem['type'] = 'FILE';
    if (typeChar === 'd') type = 'DIR';
    else if (typeChar === 'l') type = 'LINK';
    const size = sizeStr ? parseInt(sizeStr, 10) : null;
    const date = this.parseUnixDate(dateStr);
    let name = namePart.trim();
    let target: string | undefined;
    const symMatch = name.match(patterns.symlink);
    if (symMatch) {
      name = symMatch[1].trim();
      target = symMatch[2].trim();
    }
    if (!name.length) return null;
    return {
      type,
      name,
      size: type === 'DIR' ? null : size,
      date,
      target,
      permissions: typeChar + perms,
    };
  }

  parseWindowsList(line: string): FileItem | null {
    const match = line.match(patterns.windowsList);
    if (!match) return null;
    const [, dateStr, timeStr, dirOrSize, namePart] = match;
    let type: FileItem['type'] = 'FILE';
    let size: number | null = null;
    if (dirOrSize === '<DIR>') type = 'DIR';
    else {
      size = parseInt(dirOrSize, 10);
      if (Number.isNaN(size)) size = null;
    }
    const date = this.parseWindowsDate(dateStr, timeStr);
    const name = namePart.trim();
    if (!name.length) return null;
    return { type, name, size: type === 'DIR' ? null : size, date };
  }

  private parseUnixDate(dateStr: string): string | null {
    if (!dateStr) return null;
    try {
      const parts = dateStr.trim().split(/\s+/);
      if (parts.length < 3) return null;
      const monthMap: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };
      const monthNum = monthMap[parts[0]];
      if (monthNum === undefined) return null;
      const day = parseInt(parts[1], 10);
      const timeOrYear = parts[2];
      const now = new Date();
      let year: number;
      let hours = 0, minutes = 0;
      if (timeOrYear.includes(':')) {
        year = now.getFullYear();
        const [h, m] = timeOrYear.split(':');
        hours = parseInt(h, 10);
        minutes = parseInt(m, 10);
      } else {
        year = parseInt(timeOrYear, 10);
        if (year < 100) year += 2000;
      }
      return new Date(year, monthNum, day, hours, minutes).toISOString();
    } catch {
      return null;
    }
  }

  private parseWindowsDate(dateStr: string, timeStr: string): string | null {
    if (!dateStr || !timeStr) return null;
    try {
      const [month, day, year] = dateStr.split('-').map((s) => parseInt(s, 10));
      if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year)) return null;
      const fullYear = year < 100 ? 2000 + year : year;
      const tm = timeStr.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
      if (!tm) return null;
      let hours = parseInt(tm[1], 10);
      const minutes = parseInt(tm[2], 10);
      if (tm[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
      else if (tm[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
      return new Date(fullYear, month - 1, day, hours, minutes).toISOString();
    } catch {
      return null;
    }
  }
}

export function createFileParser(): FileParser {
  return new FileParser();
}
