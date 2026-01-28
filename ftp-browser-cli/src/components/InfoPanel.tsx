/**
 * InfoPanel: always-visible inline panel showing selected item info.
 * Renders 3 rows: top border + full path + type/size/permissions/date.
 */

import React from 'react';
import { Text } from 'ink';
import type { InfoPanelProps } from '../types/index.js';
import { borders, colors, getTerminalWidth } from '../utils/constants.js';
import { formatFileSize, formatDate } from '../utils/format.js';

export const InfoPanel: React.FC<InfoPanelProps> = ({ item, currentPath }) => {
  const width = getTerminalWidth();
  const borderLine = borders.horizontal.repeat(width - 2);
  const innerWidth = width - 4; // 2 border chars + 2 space padding

  if (!item) {
    return (
      <>
        <Text>
          {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
        </Text>
        <Text>
          {colors.border(borders.vertical)}
          {' '}
          {colors.muted('No item selected')}
          {' '.repeat(Math.max(0, innerWidth - 16))}
          {' '}
          {colors.border(borders.vertical)}
        </Text>
        <Text>
          {colors.border(borders.vertical)}
          {' '}
          {' '.repeat(innerWidth)}
          {' '}
          {colors.border(borders.vertical)}
        </Text>
      </>
    );
  }

  // Build full path
  const fullPath = currentPath === '/'
    ? `/${item.name}`
    : `${currentPath}/${item.name}`;

  // Truncate path from the left if too long
  const displayPath = fullPath.length > innerWidth
    ? `...${fullPath.slice(-(innerWidth - 3))}`
    : fullPath;
  // Build detail line: TYPE  SIZE  PERMISSIONS  DATE  [-> TARGET]
  const parts: string[] = [item.type];
  parts.push(formatFileSize(item.size));
  if (item.permissions) {
    parts.push(item.permissions);
  }
  parts.push(formatDate(item.date));
  if (item.target) {
    parts.push(`-> ${item.target}`);
  }
  const detailStr = parts.join('  ');
  const detailDisplay = detailStr.length > innerWidth
    ? detailStr.slice(0, innerWidth - 3) + '...'
    : detailStr;
  return (
    <>
      <Text>
        {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
      </Text>
      <Text>
        {colors.border(borders.vertical)}
        {' '}
        {colors.info(displayPath)}
        {' '.repeat(Math.max(0, innerWidth - displayPath.length))}
        {' '}
        {colors.border(borders.vertical)}
      </Text>
      <Text>
        {colors.border(borders.vertical)}
        {' '}
        {colors.muted(detailDisplay)}
        {' '.repeat(Math.max(0, innerWidth - detailDisplay.length))}
        {' '}
        {colors.border(borders.vertical)}
      </Text>
    </>
  );
};
