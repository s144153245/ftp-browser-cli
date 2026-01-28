import React from 'react';
import { Box, Text } from 'ink';
import type { ProgressBarProps } from '../types/index.js';
import { icons, colors } from '../utils/constants.js';
import { formatSpeed, formatTime } from '../utils/format.js';

/**
 * Compact single-line progress bar for downloads.
 *
 * Formats:
 *   Downloading: ⬇️  filename.bin  [████████░░░░░░░░░░░░]  45%  1.2 MB/s  ETA: 2m 30s
 *   Completed:   ✅  filename.bin  Done
 *   Failed:      ❌  filename.bin  Download failed
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const maxNameLen = 30;
  const displayName =
    progress.filename.length > maxNameLen
      ? progress.filename.slice(0, maxNameLen - 3) + '...'
      : progress.filename.padEnd(maxNameLen);

  if (progress.status === 'completed') {
    return (
      <Box>
        <Text>
          {icons.success}  {displayName}  {colors.success('Done')}
        </Text>
      </Box>
    );
  }

  if (progress.status === 'failed' || progress.status === 'cancelled') {
    const reason = progress.error || 'Download failed';
    return (
      <Box>
        <Text>
          {icons.error}  {displayName}  {colors.error(reason)}
        </Text>
      </Box>
    );
  }

  // Active download — show bar + percentage + speed + ETA
  const percentage =
    progress.totalSize > 0
      ? Math.round((progress.downloaded / progress.totalSize) * 100)
      : 0;

  const barWidth = 20;
  const filled = Math.round((percentage / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = `${'█'.repeat(filled)}${'░'.repeat(empty)}`;

  const speedText = progress.speed > 0 ? formatSpeed(progress.speed) : '';
  const etaText = progress.eta > 0 ? `ETA:${formatTime(progress.eta)}` : '';
  const statusIcon = progress.status === 'paused' ? icons.warning : icons.download;

  return (
    <Box>
      <Text>
        {statusIcon}  {displayName}  {bar}  {`${percentage}%`.padStart(4)}
        {speedText ? `  ${speedText}` : ''}
        {etaText ? `  ${etaText}` : ''}
      </Text>
    </Box>
  );
};
