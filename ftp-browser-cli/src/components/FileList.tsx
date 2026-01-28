import React from 'react';
import { Box, Text } from 'ink';
import type { FileListProps } from '../types/index.js';
import { FileListItem } from './FileListItem.js';
import { colors } from '../utils/constants.js';
import { useUIStore } from '../store/uiSlice.js';

/**
 * FileList component displaying paginated file list with selection.
 */
export const FileList: React.FC<FileListProps> = ({
  items,
  selectedIndex,
  currentPage,
  itemsPerPage,
  onSelect,
  onEnter,
}) => {
  const checkedItems = useUIStore((s) => s.checkedItems);

  // Calculate pagination
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, items.length);
  const pageItems = items.slice(startIndex, endIndex);

  // Handle empty directory
  if (items.length === 0) {
    return (
      <Box paddingY={1}>
        <Text>{colors.muted('Directory is empty')}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {pageItems.map((item, localIndex) => {
        const globalIndex = startIndex + localIndex;
        const isSelected = globalIndex === selectedIndex;
        const isChecked = checkedItems.has(globalIndex);

        return (
          <FileListItem
            key={`${item.name}-${globalIndex}`}
            item={item}
            index={globalIndex}
            isSelected={isSelected}
            isChecked={isChecked}
            onSelect={() => onSelect(globalIndex)}
            onEnter={() => onEnter(item)}
          />
        );
      })}
    </Box>
  );
};
