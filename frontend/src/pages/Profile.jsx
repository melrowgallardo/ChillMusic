import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Switch,
  FormControlLabel,
  Slider,
  Paper,
  Divider,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useOffline } from '../context/OfflineContext';
import { usePlayer } from '../context/PlayerContext';
import { getUserSettings, updateUserSettings } from '../services/firestoreService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SettingsModal from '../components/Settings/SettingsModal';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading, updateUserProfile, changePassword, deleteAccount } = useAuth();
  const { clearQueue } = usePlayer();
  const { mode, toggleTheme } = useThemeMode();
  const { isOnline, syncing, syncOfflineData } = useOffline();

  const [openSettingsModal, setOpenSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    theme: 'dark',
    auto_play: true,
    high_quality: true,
    crossfade: 0,
  });
  const [loading, setLoading] = useState(true);

  // Toast / Feedback State
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  useEffect(() => {
    if (user) {
      getUserSettings()
        .then((res) => setSettings(res))
        .catch((err) => console.warn('Failed to load user settings:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSettingChange = async (key, val) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    try {
      await updateUserSettings(updated);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleLogout = async () => {
    if (clearQueue) clearQueue();
    if (logout) await logout();
    navigate('/login');
  };

  if (authLoading || loading) return <LoadingSpinner message="Loading user profile & settings..." />;

  const safeUsername = user?.username || user?.displayName || user?.name || 'Music Lover';
  const safeEmail = user?.email || 'No email provided';
  const currentAvatar =
    user?.avatar_url || user?.avatar || user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${safeUsername}`;


  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4, pb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            borderColor: 'rgba(239, 68, 68, 0.5)',
            color: '#ef4444',
            '&:hover': { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)' },
          }}
        >
          Log Out
        </Button>
      </Box>

      {/* READ-ONLY ACCOUNT INFORMATION CARD WITH GEAR ICON */}
      <Paper className="glass-panel" sx={{ p: 4, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            👤 Account Details
          </Typography>
          <IconButton
            onClick={() => setOpenSettingsModal(true)}
            sx={{
              backgroundColor: 'rgba(124, 58, 237, 0.1)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              '&:hover': { backgroundColor: 'var(--accent-primary)', color: '#ffffff' },
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5, py: 2 }}>
          <Avatar
            src={currentAvatar}
            alt={safeUsername}
            sx={{
              width: 110,
              height: 110,
              border: '3px solid var(--accent-primary)',
              boxShadow: '0 0 24px rgba(124, 58, 237, 0.4)',
              mb: 1,
            }}
          />
          <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            {safeUsername}
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            {safeEmail}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => setOpenSettingsModal(true)}
            sx={{
              mt: 2,
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              fontWeight: 700,
              borderRadius: 'var(--radius-full)',
              px: 3,
            }}
          >
            Edit Settings
          </Button>
        </Box>
      </Paper>

      {/* PLAYBACK & APPEARANCE PREFERENCES */}
      <Paper className="glass-panel" sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          🎨 Playback & Appearance
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={toggleTheme} color="primary" />}
            label="Dark Mode Interface"
          />

          <Divider sx={{ borderColor: 'var(--border-color)' }} />

          <FormControlLabel
            control={
              <Switch
                checked={settings.auto_play}
                onChange={(e) => handleSettingChange('auto_play', e.target.checked)}
                color="primary"
              />
            }
            label="Autoplay Next Recommended Track"
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.high_quality}
                onChange={(e) => handleSettingChange('high_quality', e.target.checked)}
                color="primary"
              />
            }
            label="High Quality Audio Streaming (320kbps)"
          />

          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Crossfade Duration: {settings.crossfade} seconds
            </Typography>
            <Slider
              value={settings.crossfade}
              min={0}
              max={12}
              onChange={(_, val) => handleSettingChange('crossfade', val)}
              valueLabelDisplay="auto"
              sx={{ color: 'var(--accent-primary)', maxWidth: 400 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* OFFLINE SYNCHRONIZATION */}
      <Paper className="glass-panel" sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          ⚡ Offline Synchronization
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
          Network Connection Status: <strong style={{ color: isOnline ? '#10b981' : '#ef4444' }}>{isOnline ? 'Online' : 'Offline'}</strong>
        </Typography>
        <Button
          variant="outlined"
          startIcon={<SyncIcon sx={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />}
          onClick={syncOfflineData}
          disabled={!isOnline || syncing}
          sx={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', fontWeight: 700 }}
        >
          {syncing ? 'Syncing Now...' : 'Force Offline Queue Sync'}
        </Button>
      </Paper>

      {/* DEDICATED SETTINGS MODAL */}
      <SettingsModal
        open={openSettingsModal}
        onClose={() => setOpenSettingsModal(false)}
        user={user}
        updateUserProfile={updateUserProfile}
        changePassword={changePassword}
        deleteAccount={deleteAccount}
        showToast={showToast}
      />

      {/* FEEDBACK TOAST / SNACKBAR */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%', fontWeight: 700 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;


