import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';
import { useOffline } from '../../context/OfflineContext';

const OfflineBanner = () => {
  const { isOnline, syncing, syncMessage, syncOfflineData } = useOffline();

  if (isOnline && !syncMessage) return null;

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: isOnline ? 'rgba(6, 182, 212, 0.9)' : 'rgba(239, 68, 68, 0.9)',
        color: '#ffffff',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.875rem',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {syncing ? (
          <SyncIcon sx={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <WifiOffIcon />
        )}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {syncMessage || (isOnline ? 'Back online!' : 'You are currently offline. Playing cached songs.')}
        </Typography>
      </Box>

      {isOnline && !syncing && (
        <Button
          size="small"
          onClick={syncOfflineData}
          sx={{ color: '#ffffff', borderColor: '#ffffff', fontWeight: 600 }}
        >
          Sync Now
        </Button>
      )}
    </Box>
  );
};

export default OfflineBanner;
