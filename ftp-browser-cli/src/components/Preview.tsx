import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { PreviewProps } from '../types/index.js';
import { borders, colors, defaults, getTerminalWidth } from '../utils/constants.js';

/**
 * Preview component for displaying file content preview.
 */
export const Preview: React.FC<PreviewProps> = ({
  filePath,
  content,
  onClose,
}) => {
  useInput((input, key) => {
    if (key.escape || key.return || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
      onClose();
    }
  });

  const width = getTerminalWidth();
  const borderLine = borders.horizontal.repeat(width - 2);
  
  // Limit content to maxPreviewLines, truncate long lines
  const maxLineWidth = width - 4; // 2 border chars + 2 padding
  const lines = content.split('\n').slice(0, defaults.maxPreviewLines).map((line) =>
    line.length > maxLineWidth ? line.slice(0, maxLineWidth - 3) + '...' : line
  );
  const displayContent = lines.join('\n');
  const truncated = content.split('\n').length > defaults.maxPreviewLines;

  return (
    <Box flexDirection="column">
      <Text>
        {colors.border(`${borders.topLeft}${borderLine}${borders.topRight}`)}
      </Text>
      <Text>
        {colors.border(borders.vertical)}
        {' '}
        {colors.highlight(`Preview: ${filePath}`)}
        {' '.repeat(Math.max(1, width - filePath.length - 11))}
        {colors.border(borders.vertical)}
      </Text>
      <Text>
        {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
      </Text>
      <Box flexDirection="column" paddingX={1}>
        {displayContent.split('\n').map((line, index) => (
          <Text key={index}>{line}</Text>
        ))}
        {truncated && (
          <Text>
            {colors.muted(`... (truncated, showing first ${defaults.maxPreviewLines} lines)`)}
          </Text>
        )}
      </Box>
      <Text>
        {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
      </Text>
      <Text>
        {colors.border(borders.vertical)}
        {' '}
        {colors.muted('Press any key to close')}
        {' '.repeat(Math.max(1, width - 25))}
        {colors.border(borders.vertical)}
      </Text>
      <Text>
        {colors.border(`${borders.bottomLeft}${borderLine}${borders.bottomRight}`)}
      </Text>
    </Box>
  );
};
