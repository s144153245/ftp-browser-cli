import React from 'react';
import { Box, Text } from 'ink';
import type { HeaderProps } from '../types/index.js';
import { borders, colors, version, getTerminalWidth } from '../utils/constants.js';

/**
 * Header component displaying FTP server hostname and version.
 */
export const Header: React.FC<HeaderProps> = ({ host, version: versionProp }) => {
  const versionStr = versionProp || version.full;
  const title = `FTP Browser - ${host}`;
  const versionText = `v${versionStr}`;

  const width = getTerminalWidth();
  const borderLine = borders.horizontal.repeat(width - 2);

  // Calculate spacing for version alignment
  const titleLength = title.length;
  const versionLength = versionText.length;
  const spacing = Math.max(1, width - titleLength - versionLength - 4); // 4 for borders and padding

  return (
    <Box flexDirection="column">
      <Text>
        {colors.border(`${borders.topLeft}${borderLine}${borders.topRight}`)}
      </Text>
      <Text>
        {colors.border(borders.vertical)}
        {' '}
        {title}
        {' '.repeat(spacing)}
        {versionText}
        {' '}
        {colors.border(borders.vertical)}
      </Text>
      <Text>
        {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
      </Text>
    </Box>
  );
};
