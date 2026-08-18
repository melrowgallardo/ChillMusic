import React, { useState } from 'react';
import { Box, Typography, Button, Avatar, Paper, IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import SettingsModal from '../components/Settings/SettingsModal';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function Settings() {
  const { user, logout, loading, updateUserProfile, changePassword, deleteAccount } = useAuth();
  const { clearQueue } = usePlayer();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#ffffff' }}>
        <LoadingSpinner message="Loading profile..." />
      </Box>
    );
  }

  const safeUsername = user?.username || user?.displayName || user?.name || 'Music Lover';
  const safeEmail = user?.email || 'No email provided';
  const safeAvatar = user?.avatar_url || user?.avatar || user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${safeUsername}`;

  const handleLogout = async () => {
    try {
      if (clearQueue) clearQueue();
      if (logout) await logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 700, mx: 'auto', color: '#ffffff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          User Profile
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            fontWeight: 700,
            borderColor: 'rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            borderRadius: 'var(--radius-md, 8px)',
            '&:hover': { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
          }}
        >
          LOG OUT
        </Button>
      </Box>

      <Paper
        className="glass-panel"
        sx={{
          p: { xs: 3, sm: 5 },
          position: 'relative',
          borderRadius: 'var(--radius-lg, 16px)',
          backgroundColor: '#181824',
          border: '1px solid #2a2b3d',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        <IconButton
          onClick={() => setIsSettingsOpen(true)}
          sx={{
            position: 'absolute',
            top: 24,
            right: 24,
            backgroundColor: '#24263a',
            color: 'var(--accent-primary, #a855f7)',
            '&:hover': { backgroundColor: '#323550' },
          }}
          title="Account Settings"
        >
          <SettingsIcon />
        </IconButton>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
          <Avatar
            src={safeAvatar}
            alt="Profile Avatar"
            sx={{
              width: 100,
              height: 100,
              border: '4px solid var(--accent-primary, #7c3aed)',
              boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
            }}
          />

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff' }}>
              {safeUsername}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary, #a1a1aa)', mt: 0.5 }}>
              {safeEmail}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setIsSettingsOpen(true)}
            sx={{
              mt: 2,
              borderColor: 'rgba(168, 85, 247, 0.4)',
              color: '#d8b4fe',
              borderRadius: 'var(--radius-full, 9999px)',
              px: 3,
              py: 1,
              fontWeight: 600,
              fontSize: '0.875rem',
              '&:hover': { backgroundColor: '#7c3aed', color: '#ffffff', borderColor: '#7c3aed' },
            }}
          >
            EDIT SETTINGS
          </Button>
        </Box>
      </Paper>

      {isSettingsOpen && (
        <SettingsModal
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          user={user}
          updateUserProfile={updateUserProfile}
          changePassword={changePassword}
          deleteAccount={deleteAccount}
        />
      )}
    </Box>
  );
}
