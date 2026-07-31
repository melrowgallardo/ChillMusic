import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = ({ message = 'Loading music...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        width: '100%',
        gap: 2,
      }}
    >
      <CircularProgress size={44} sx={{ color: 'var(--accent-primary)' }} />
      <Typography variant="body2" sx={{ color: 'var(--text-muted)', fontWeight: 500 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;
