import React from 'react';
import { Box, Text } from 'ink';
import type { FileListItemProps } from '../types/index.js';
import { icons, colors } from '../utils/constants.js';
import { formatFileSize } from '../utils/format.js';

/**
 * FileListItem component for rendering a single file item in the list.
 * Uses fixed-width columns for alignment.
 */
export const FileListItem: React.FC<FileListItemProps> = ({
  item,
  index,
  isSelected,
  isChecked,
}) => {
  // Checkbox column: [✓] or [ ]
  const checkMark = isChecked ? '[✓]' : '[ ]';

  // Cursor indicator
  const cursor = isSelected ? '▸' : ' ';

  // Item number right-padded
  const itemNumber = `[${index + 1}]`;

  // Icon based on file type
  const icon =
    item.type === 'DIR'
      ? icons.directory
      : item.type === 'LINK'
        ? icons.symlink
        : icons.file;

  // Type label
  const typeLabel =
    item.type === 'DIR'
      ? '[DIR] '
      : item.type === 'LINK'
        ? '[LINK]'
        : '[FILE]';

  // Color based on file type
  const itemColor =
    item.type === 'DIR'
      ? colors.directory
      : item.type === 'LINK'
        ? colors.symlink
        : colors.file;

  // Format file size
  const sizeText = item.size !== null ? `(${formatFileSize(item.size)})` : '';
  const symlinkTarget = item.target ? ` -> ${item.target}` : '';

  const textColor = isSelected ? colors.selected : itemColor;

  return (
    <Box>
      <Box width={4}>
        <Text>{isChecked ? colors.success(checkMark) : colors.muted(checkMark)}</Text>
      </Box>
      <Box width={2}>
        <Text>{isSelected ? colors.selected(cursor) : cursor}</Text>
      </Box>
      <Box width={5}>
        <Text>{colors.muted(itemNumber.padEnd(5))}</Text>
      </Box>
      <Box width={3}>
        <Text>{icon} </Text>
      </Box>
      <Box width={7}>
        <Text>{colors.muted(typeLabel)}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text>
          {textColor(item.name)}
          {item.path && ` ${colors.muted(`in ${item.path}`)}`}
          {symlinkTarget && ` ${colors.muted(symlinkTarget)}`}
          {sizeText && ` ${colors.muted(sizeText)}`}
        </Text>
      </Box>
    </Box>
  );
};
