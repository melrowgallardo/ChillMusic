import React from 'react';
import { Box, Typography } from '@mui/material';
import TrackRow from './TrackRow';

const TrackList = ({ tracks = [], onAddToPlaylist, onRemoveTrack }) => {
  const trackList = Array.isArray(tracks) ? tracks : [];

  if (!trackList.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-muted)' }}>
        <Typography variant="body1">No tracks available.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justify: 'space-between',
          px: 2,
          py: 1,
          borderBottom: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        <Box sx={{ flex: 1 }}># TITLE</Box>
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }}>ALBUM</Box>
        <Box sx={{ width: 80, textAlign: 'right' }}>DURATION</Box>
      </Box>

      {/* Rows */}
      {trackList.map((track, idx) => (
        <TrackRow
          key={`${track?.id || track?.videoId || idx}-${idx}`}
          track={track}
          index={idx}
          queue={trackList}
          onAddToPlaylist={onAddToPlaylist}
          onRemoveTrack={onRemoveTrack}
        />
      ))}
    </Box>
  );
};


export default TrackList;
