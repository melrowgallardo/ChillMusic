import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Switch,
  FormControlLabel,
  Slider,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SyncIcon from '@mui/icons-material/Sync';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useNavigate } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useOffline } from '../context/OfflineContext';
import { usePlayer } from '../context/PlayerContext';
import { getUserSettings, updateUserSettings, deleteUserData } from '../services/firestoreService';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateUserProfile } = useAuth();
  const { clearQueue } = usePlayer();
  const { mode, toggleTheme } = useThemeMode();
  const { isOnline, syncing, syncOfflineData } = useOffline();

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [settings, setSettings] = useState({
    theme: 'dark',
    auto_play: true,
    high_quality: true,
    crossfade: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setAvatarUrl(user.avatar_url || '');

      getUserSettings()
        .then((res) => setSettings(res))
        .catch((err) => console.warn('Failed to load user settings:', err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile({ username, avatar_url: avatarUrl });
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

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
    clearQueue();
    await logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      if (user && user.uid) {
        await deleteUserData(user.uid);
      }
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
      clearQueue();
      localStorage.clear();
      sessionStorage.clear();
      setToastMsg('Account deleted successfully');

      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error('Failed to delete account:', err);
      if (err.code === 'auth/requires-recent-login') {
        alert('Security Notice: Deleting your account requires a recent login. Please log in again and retry.');
      } else {
        alert('Failed to delete account: ' + (err.message || err));
      }
    } finally {
      setIsDeleting(false);
      setOpenConfirmDelete(false);
    }
  };

  if (!user) return <Typography sx={{ p: 4 }}>Please log in to view profile.</Typography>;
  if (loading) return <LoadingSpinner message="Loading user profile..." />;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
        Profile & Settings
      </Typography>

      {message && (
        <Paper sx={{ p: 2, backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', borderRadius: 'var(--radius-sm)' }}>
          {message}
        </Paper>
      )}

      {/* User Information Form */}
      <Paper className="glass-panel" sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          Account Details
        </Typography>

        <form onSubmit={handleProfileSave}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Avatar
                src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
                sx={{ width: 90, height: 90, border: '2px solid var(--accent-primary)' }}
              />
            </Box>

            <TextField
              label="Username"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <TextField
              label="Email"
              fullWidth
              disabled
              value={user.email}
              helperText="Email address cannot be changed."
            />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                sx={{ backgroundColor: 'var(--accent-primary)', fontWeight: 700, px: 3 }}
              >
                Save Profile
              </Button>
              <Button
                type="button"
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  fontWeight: 700,
                  px: 3,
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  color: '#ef4444',
                  '&:hover': {
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  },
                }}
              >
                Log Out
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>

      {/* Playback Preferences */}
      <Paper className="glass-panel" sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          Playback & Appearance Preferences
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
            label="High Audio Quality Streaming (320kbps)"
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

      {/* Offline Sync Status */}
      <Paper className="glass-panel" sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Offline Synchronization
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

      {/* Danger Zone: Delete Account */}
      <Paper
        className="glass-panel"
        sx={{
          p: 4,
          borderColor: 'rgba(239, 68, 68, 0.4)',
          backgroundColor: 'rgba(239, 68, 68, 0.04)',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#ef4444', mb: 1 }}>
          Danger Zone
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
          Permanently remove your profile data, saved playlists, favorites, and playback history.
        </Typography>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteForeverIcon />}
          onClick={() => setOpenConfirmDelete(true)}
          sx={{
            backgroundColor: '#ef4444',
            fontWeight: 700,
            px: 3,
            '&:hover': { backgroundColor: '#dc2626' },
          }}
        >
          🗑️ Delete Account
        </Button>
      </Paper>

      {/* Account Deletion Confirmation Dialog */}
      <Dialog
        open={openConfirmDelete}
        onClose={() => setOpenConfirmDelete(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-md)',
            p: 1,
            maxWidth: 480,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#ef4444' }}>
          Delete Account Permanently?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to permanently delete your account and all saved playlists? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setOpenConfirmDelete(false)}
            sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            variant="contained"
            color="error"
            sx={{ backgroundColor: '#ef4444', fontWeight: 700, '&:hover': { backgroundColor: '#dc2626' } }}
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Feedback Toast */}
      <Snackbar
        open={Boolean(toastMsg)}
        autoHideDuration={3000}
        onClose={() => setToastMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%', fontWeight: 700 }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;
