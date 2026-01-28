import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { InputPromptProps } from '../types/index.js';
import { colors } from '../utils/constants.js';

/**
 * InputPrompt component for user input with Enter/Escape handling.
 */
export const InputPrompt: React.FC<InputPromptProps> = ({
  prompt,
  value,
  onChange,
  onSubmit,
  onCancel,
}) => {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      onSubmit();
    }
  });

  return (
    <Box>
      <Text>
        {colors.highlight(prompt)}
      </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    </Box>
  );
};
