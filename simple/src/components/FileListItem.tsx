import React from 'react';
import { Box, Text } from 'ink';
import type { FileListItemProps } from '../types/index.js';
import { icons, colors } from '../utils/constants.js';
import { formatFileSize } from '../utils/format.js';

/**
 * FileListItem component for rendering a single file item in the list.
 */
export const FileListItem: React.FC<FileListItemProps> = ({
  item,
  index,
  isSelected,
  onSelect,
  onEnter,
}) => {
  const selectionIndicator = isSelected ? '▸' : ' ';
  const itemNumber = `[${index + 1}]`;
  
  // Get icon based on file type
  const icon = item.type === 'DIR' 
    ? icons.directory 
    : item.type === 'LINK' 
    ? icons.symlink 
    : icons.file;
  
  // Get type label
  const typeLabel = item.type === 'DIR' 
    ? '[DIR]' 
    : item.type === 'LINK' 
    ? '[LINK]' 
    : '[FILE]';
  
  // Get color based on file type
  const itemColor = item.type === 'DIR' 
    ? colors.directory 
    : item.type === 'LINK' 
    ? colors.symlink 
    : colors.file;
  
  // Format file size
  const sizeText = item.size !== null ? `(${formatFileSize(item.size)})` : '';
  
  // Build display text
  const displayName = item.name;
  const symlinkTarget = item.target ? ` -> ${item.target}` : '';
  
  // Apply selected color if selected
  const textColor = isSelected ? colors.selected : itemColor;
  
  // Format: [1]  📁 [DIR]  configs/
  // Format: ▸ [4]  📄 [FILE] firmware_v1.2.3.bin              (125.4 MB)
  // Format: [6]  🔗 [LINK] latest -> firmware_v1.2.3.bin
  
  return (
    <Box>
      <Text>
        {selectionIndicator} {itemNumber}  {icon} {typeLabel}  {textColor(displayName)}
        {symlinkTarget && ` ${colors.muted(symlinkTarget)}`}
        {sizeText && ` ${colors.muted(sizeText)}`}
      </Text>
    </Box>
  );
};
