import React from 'react';
import { Box } from '@mui/material';

const AudioVisualizer = ({ isPlaying }) => {
  if (!isPlaying) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '18px' }}>
      <Box className="equalizer-bar" />
      <Box className="equalizer-bar" />
      <Box className="equalizer-bar" />
      <Box className="equalizer-bar" />
    </Box>
  );
};

export default AudioVisualizer;
