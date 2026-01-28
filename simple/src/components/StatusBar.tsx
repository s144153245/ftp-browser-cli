import React from 'react';
import { Box, Text } from 'ink';
import type { StatusBarProps } from '../types/index.js';
import { borders, colors } from '../utils/constants.js';

/**
 * StatusBar component displaying pagination info and keyboard shortcuts.
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  currentPage,
  totalPages,
  totalItems,
  mode,
}) => {
  const width = 70;
  const borderLine = borders.horizontal.repeat(width - 2);
  
  // Build pagination text
  const paginationText = `Page ${currentPage + 1}/${totalPages} (${totalItems} items)`;
  
  // Build shortcuts text
  const shortcuts = mode === 'browse' 
    ? '[n]Next [p]Prev [/]Search [?]Help'
    : mode === 'search'
    ? '[Esc]Cancel'
    : mode === 'preview'
    ? '[Esc]Close'
    : mode === 'help'
    ? '[Esc]Close'
    : '[Esc]Cancel';
  
  // Calculate spacing
  const paginationLength = paginationText.length;
  const shortcutsLength = shortcuts.length;
  const spacing = Math.max(1, width - paginationLength - shortcutsLength - 4);
  
  // Show mode if not browse
  const modeText = mode !== 'browse' ? `[${mode.toUpperCase()}] ` : '';

  return (
    <Box flexDirection="column">
      <Text>
        {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
      </Text>
      <Text>
        {colors.border(borders.vertical)}
        {' '}
        {paginationText}
        {modeText && colors.highlight(modeText)}
        {' '.repeat(spacing)}
        {shortcuts}
        {' '}
        {colors.border(borders.vertical)}
      </Text>
      <Text>
        {colors.border(`${borders.bottomLeft}${borderLine}${borders.bottomRight}`)}
      </Text>
    </Box>
  );
};
