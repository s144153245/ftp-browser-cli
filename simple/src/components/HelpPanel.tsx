import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { HelpPanelProps } from '../types/index.js';
import { borders, colors, keys } from '../utils/constants.js';

/**
 * HelpPanel component displaying keyboard shortcuts and commands.
 */
export const HelpPanel: React.FC<HelpPanelProps> = ({ onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose();
    }
  });

  const width = 70;
  const borderLine = borders.horizontal.repeat(width - 2);

  const shortcuts = [
    { key: '↑/k', description: 'Move up' },
    { key: '↓/j', description: 'Move down' },
    { key: 'Enter', description: 'Select item / Enter directory' },
    { key: '/', description: 'Search files' },
    { key: 'd', description: 'Download file' },
    { key: 'p', description: 'Preview file' },
    { key: 'i', description: 'Show file info' },
    { key: 'r', description: 'Refresh directory' },
    { key: '?/h', description: 'Show help' },
    { key: 'n', description: 'Next page' },
    { key: 'p', description: 'Previous page' },
    { key: 'b', description: 'Go back' },
    { key: 'q/Esc', description: 'Quit / Cancel' },
    { key: '1-9', description: 'Quick select item by number' },
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
        {' '.repeat(Math.max(1, width - 19))}
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
        {' '.repeat(Math.max(1, width - 24))}
        {colors.border(borders.vertical)}
      </Text>
      <Text>
        {colors.border(`${borders.bottomLeft}${borderLine}${borders.bottomRight}`)}
      </Text>
    </Box>
  );
};
