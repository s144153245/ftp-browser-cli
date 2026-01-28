import React from 'react';
import { Box, Text } from 'ink';
import type { BreadcrumbProps } from '../types/index.js';
import { colors } from '../utils/constants.js';
import { formatPath } from '../utils/format.js';

/**
 * Breadcrumb component displaying current FTP path.
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({ path }) => {
  const displayPath = path || '/';
  const truncatedPath = formatPath(displayPath, 60);
  const icon = '📍';

  return (
    <Box>
      <Text>
        {icon} {colors.info(truncatedPath)}
      </Text>
    </Box>
  );
};
