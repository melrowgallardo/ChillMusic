import React from 'react';
import { Box } from '@mui/material';

const GlassCard = ({ children, sx, className, onClick, ...props }) => {
  return (
    <Box
      className={`glass-card ${className || ''}`}
      onClick={onClick}
      sx={{
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default GlassCard;
