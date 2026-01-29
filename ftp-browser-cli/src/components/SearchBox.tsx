import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { SearchBoxProps } from '../types/index.js';
import { icons, colors, statusMessages } from '../utils/constants.js';

/**
 * SearchBox component for search input with active state handling.
 */
export const SearchBox: React.FC<SearchBoxProps> = ({
  isActive,
  query,
  onSearch,
  onCancel,
  isSearching = false,
  inputFocused,
}) => {
  useInput((input, key) => {
    if (!isActive) return;

    if (key.escape) {
      onCancel();
    }
  });

  if (!isActive) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text>
          {icons.search} {colors.info('Search:')} {' '}
        </Text>
        <TextInput
          value={query}
          onChange={onSearch}
          onSubmit={() => onSearch(query)}
          focus={inputFocused ?? true}
        />
        {inputFocused === false && <Text>{colors.muted(' [Tab]Edit')}</Text>}
      </Box>
      {isSearching && (
        <Box>
          <Text>
            {colors.muted(statusMessages.searching)}
          </Text>
        </Box>
      )}
    </Box>
  );
};
