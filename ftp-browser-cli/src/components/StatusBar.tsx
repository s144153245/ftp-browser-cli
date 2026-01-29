import React from 'react';
import { Box, Text } from 'ink';
import type { StatusBarProps } from '../types/index.js';
import { borders, colors, getTerminalWidth } from '../utils/constants.js';
import { useUIStore } from '../store/uiSlice.js';

/**
 * StatusBar component displaying pagination info and keyboard shortcuts.
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  currentPage,
  totalPages,
  totalItems,
  mode,
}) => {
  const checkedItems = useUIStore((s) => s.checkedItems);
  const checkedCount = checkedItems.size;

  const width = getTerminalWidth();
  const borderLine = borders.horizontal.repeat(width - 2);

  // Build pagination text
  const paginationText = `Page ${currentPage + 1}/${totalPages} (${totalItems} items)`;

  // Build selected count text
  const selectedText = checkedCount > 0 ? ` | ${checkedCount} sel` : '';

  // Build shortcuts text — use shorter labels
  const shortcuts =
    mode === 'browse'
      ? '[Space]Sel [d]DL [p]Prev [?]Help'
      : mode === 'search'
        ? '[Up/Dn]Nav [Enter]Select [Esc]Cancel'
        : mode === 'preview'
          ? '[Esc]Close'
          : mode === 'help'
            ? '[Esc]Close'
            : '[Esc]Cancel';

  // Show mode if not browse
  const modeText = mode !== 'browse' ? `[${mode.toUpperCase()}] ` : '';

  // Calculate spacing accounting for all visible text
  const leftText = paginationText + selectedText;
  const rightText = modeText + shortcuts;
  const available = width - leftText.length - rightText.length - 4;
  const spacing = Math.max(1, available);

  return (
    <Box flexDirection="column">
      <Text>
        {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
      </Text>
      <Text>
        {colors.border(borders.vertical)}
        {' '}
        {paginationText}
        {selectedText && colors.highlight(selectedText)}
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
