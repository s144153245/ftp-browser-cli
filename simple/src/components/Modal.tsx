import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ModalProps } from '../types/index.js';
import { borders, colors } from '../utils/constants.js';

/**
 * Modal component for displaying dialogs with options.
 */
export const Modal: React.FC<ModalProps> = ({
  title,
  message,
  options = [],
  onSelect,
  onCancel,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      if (options.length > 0) {
        onSelect(options[selectedIndex]);
      } else {
        onCancel();
      }
    } else if (key.upArrow || input === 'k') {
      if (options.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (key.downArrow || input === 'j') {
      if (options.length > 0) {
        setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (input >= '1' && input <= '9') {
      const num = parseInt(input, 10) - 1;
      if (num >= 0 && num < options.length) {
        onSelect(options[num]);
      }
    }
  });

  const width = 60;
  const borderLine = borders.horizontal.repeat(width - 2);

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center">
      <Box flexDirection="column" borderStyle="single" width={width}>
        <Text>
          {colors.border(`${borders.topLeft}${borderLine}${borders.topRight}`)}
        </Text>
        <Text>
          {colors.border(borders.vertical)}
          {' '}
          {colors.highlight(title)}
          {' '.repeat(Math.max(1, width - title.length - 3))}
          {colors.border(borders.vertical)}
        </Text>
        <Text>
          {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
        </Text>
        <Box paddingX={1} paddingY={1}>
          <Text>{message}</Text>
        </Box>
        {options.length > 0 && (
          <Box flexDirection="column" paddingX={1} paddingY={1}>
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              const optionText = `[${index + 1}] ${option}`;
              return (
                <Text key={option}>
                  {isSelected ? colors.selected(`▸ ${optionText}`) : `  ${optionText}`}
                </Text>
              );
            })}
          </Box>
        )}
        <Text>
          {colors.border(`${borders.leftT}${borderLine}${borders.rightT}`)}
        </Text>
        <Text>
          {colors.border(borders.vertical)}
          {' '}
          {colors.muted('Press Enter to select, Esc to cancel')}
          {' '.repeat(Math.max(1, width - 37))}
          {colors.border(borders.vertical)}
        </Text>
        <Text>
          {colors.border(`${borders.bottomLeft}${borderLine}${borders.bottomRight}`)}
        </Text>
      </Box>
    </Box>
  );
};
