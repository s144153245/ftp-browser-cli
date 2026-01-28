import React from 'react';
import { Box, Text } from 'ink';
import type { ProgressBarProps } from '../types/index.js';
import { icons, colors } from '../utils/constants.js';
import { formatFileSize, formatSpeed, formatTime } from '../utils/format.js';

/**
 * ProgressBar component for displaying download progress.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  onCancel,
  onPause,
  onResume,
}) => {
  const percentage = progress.totalSize > 0
    ? Math.round((progress.downloaded / progress.totalSize) * 100)
    : 0;
  
  // Build progress bar (20 characters wide)
  const barWidth = 20;
  const filled = Math.round((percentage / 100) * barWidth);
  const empty = barWidth - filled;
  const progressBar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  
  // Get status icon
  const statusIcon = progress.status === 'completed'
    ? icons.success
    : progress.status === 'failed' || progress.status === 'cancelled'
    ? icons.error
    : progress.status === 'paused'
    ? icons.warning
    : icons.download;
  
  // Format values
  const percentageText = `${percentage}%`;
  const speedText = progress.speed > 0 ? formatSpeed(progress.speed) : '0 B/s';
  const etaText = progress.eta > 0 ? `ETA: ${formatTime(progress.eta)}` : 'ETA: --';
  
  // Color based on status
  const statusColor = progress.status === 'completed'
    ? colors.success
    : progress.status === 'failed' || progress.status === 'cancelled'
    ? colors.error
    : colors.info;
  
  // Format: ⬇️  downloading_file.bin  [████████░░] 45%  1.2 MB/s  ETA: 2m 30s
  return (
    <Box flexDirection="column">
      <Box>
        <Text>
          {statusIcon}  {progress.filename}  {progressBar}  {percentageText}  {speedText}  {etaText}
        </Text>
      </Box>
      {progress.error && (
        <Box>
          <Text>
            {colors.error(`Error: ${progress.error}`)}
          </Text>
        </Box>
      )}
      {(onCancel || onPause || onResume) && (
        <Box>
          {onCancel && (
            <Text>
              {' '}
              {colors.error('[c]Cancel')}
            </Text>
          )}
          {progress.status === 'downloading' && onPause && (
            <Text>
              {' '}
              {colors.warning('[p]Pause')}
            </Text>
          )}
          {progress.status === 'paused' && onResume && (
            <Text>
              {' '}
              {colors.success('[r]Resume')}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};
