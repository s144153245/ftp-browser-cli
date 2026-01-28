import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { HelpPanelProps } from '../types/index.js';
import { borders, colors, getTerminalWidth } from '../utils/constants.js';

/**
 * HelpPanel component displaying keyboard shortcuts and commands.
 */
export const HelpPanel: React.FC<HelpPanelProps> = ({ onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose();
    }
  });

  const width = getTerminalWidth();
  const borderLine = borders.horizontal.repeat(width - 2);

  const shortcuts = [
    { key: '\u2191/k', description: 'Move cursor up' },
    { key: '\u2193/j', description: 'Move cursor down' },
    { key: '\u2190/Bksp', description: 'Go back (parent directory)' },
    { key: '\u2192/Enter', description: 'Enter directory' },
    { key: 'Enter', description: 'Toggle selection (on files)' },
    { key: 'Space', description: 'Toggle selection on current item' },
    { key: 'a', description: 'Select all / Deselect all' },
    { key: 'd', description: 'Download selected (or current) items' },
    { key: 'p', description: 'Preview file' },
    { key: '/', description: 'Search files' },
    { key: 'r', description: 'Refresh directory' },
    { key: '?/h', description: 'Show this help' },
    { key: 'n/PgDn', description: 'Next page' },
    { key: 'PgUp', description: 'Previous page' },
    { key: 'g', description: 'First page' },
    { key: 'G', description: 'Last page' },
    { key: '1-9', description: 'Quick move cursor to item N' },
    { key: 'Esc', description: 'Clear selection / Go back' },
    { key: 'q', description: 'Quit application' },
  ];

  return (
    <Box flexDirection="column">
      <Text>
        {colors.border(`${borders.topLeft}${borderLine}${borders.topRight}`)}
      </Text>
      <Text>
        {colors.border(borders.vertical)}
        {' '}
        {colors.highlight('Keyboard Shortcuts')}
        {' '.repeat(Math.max(1, width - 21))}
        {colors.border(borders.vertical)}
      </Text>
      <Text>
        {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
      </Text>
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        {shortcuts.map((shortcut, index) => (
          <Box key={index} justifyContent="space-between">
            <Text>
              {colors.selected(shortcut.key.padEnd(12))}
            </Text>
            <Text>
              {shortcut.description}
            </Text>
          </Box>
        ))}
      </Box>
      <Text>
        {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
      </Text>
      <Text>
        {colors.border(borders.vertical)}
        {' '}
        {colors.muted('Press Esc or q to close')}
        {' '.repeat(Math.max(1, width - 26))}
        {colors.border(borders.vertical)}
      </Text>
      <Text>
        {colors.border(`${borders.bottomLeft}${borderLine}${borders.bottomRight}`)}
      </Text>
    </Box>
  );
};
