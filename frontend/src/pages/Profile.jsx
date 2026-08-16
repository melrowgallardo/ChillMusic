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
  IconButton,
  Grid,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import SyncIcon from '@mui/icons-material/Sync';
import LogoutIcon from '@mui/icons-material/Logout';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useOffline } from '../context/OfflineContext';
import { usePlayer } from '../context/PlayerContext';
import { getUserSettings, updateUserSettings, deleteUserData } from '../services/firestoreService';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=ChillVibes1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=MusicLover2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=LofiBeats3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SonicMaster4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=GrooveAgent5',
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateUserProfile, changePassword, deleteAccount } = useAuth();
  const { clearQueue } = usePlayer();
  const { mode, toggleTheme } = useThemeMode();
  const { isOnline, syncing, syncOfflineData } = useOffline();

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // App settings state
  const [settings, setSettings] = useState({
    theme: 'dark',
    auto_play: true,
    high_quality: true,
    crossfade: 0,
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast / Feedback State
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleAvatarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be under 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setAvatarUrl(reader.result);
        showToast('Custom photo preview ready. Click Save Changes to apply!', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (user) {
      setUsername(user.username || user.displayName || '');
      setEmail(user.email || '');
      setAvatarUrl(user.avatar_url || user.avatar || user.photoURL || PRESET_AVATARS[0]);

      getUserSettings()
        .then((res) => setSettings(res))
        .catch((err) => console.warn('Failed to load user settings:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // Section 1: Account Information Save Handler
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast('Username cannot be empty', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      await updateUserProfile({
        username: username.trim(),
        email: email.trim(),
        avatar_url: avatarUrl,
        avatar: avatarUrl,
      });
      showToast('Account details updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast(err.message || 'Failed to update account details.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Section 2: Security & Password Update Handler
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      showToast('Please enter a new password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update password:', err);
      showToast(err.message || 'Failed to update password. Please check your current password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Section 3: Danger Zone Account Deletion Handler
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      if (user && (user.uid || user.id)) {
        await deleteUserData(user.uid || user.id);
      }
      clearQueue();
      await deleteAccount();
      showToast('Account deleted successfully', 'info');

      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      console.error('Failed to delete account:', err);
      if (err.code === 'auth/requires-recent-login') {
        showToast('Security Notice: Account deletion requires recent login. Please log in again.', 'error');
      } else {
        showToast('Failed to delete account: ' + (err.message || err), 'error');
      }
    } finally {
      setIsDeleting(false);
      setOpenConfirmDelete(false);
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
    navigate('/login');
  };

  if (!user) return <Typography sx={{ p: 4 }}>Please log in to view profile.</Typography>;
  if (loading) return <LoadingSpinner message="Loading user profile & settings..." />;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4, pb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Profile & Settings
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

      {/* SECTION 1: ACCOUNT INFORMATION */}
      <Paper className="glass-panel" sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          👤 Account Information
        </Typography>

        <form onSubmit={handleProfileSave}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Avatar Preview & Selection */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
                  sx={{ width: 105, height: 105, border: '3px solid var(--accent-primary)', boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)' }}
                />
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="custom-avatar-upload"
                  type="file"
                  onChange={handleAvatarFileUpload}
                />
                <label htmlFor="custom-avatar-upload">
                  <IconButton
                    component="span"
                    size="small"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: 'var(--accent-primary)',
                      color: '#ffffff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                      '&:hover': { backgroundColor: 'var(--accent-pink)' },
                    }}
                  >
                    <PhotoCameraIcon fontSize="small" />
                  </IconButton>
                </label>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  component="label"
                  htmlFor="custom-avatar-upload"
                  size="small"
                  startIcon={<PhotoCameraIcon />}
                  sx={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', fontWeight: 600 }}
                >
                  Upload Custom Photo
                </Button>
              </Box>

              <Typography variant="caption" sx={{ color: 'var(--text-muted)', mt: 1 }}>
                Or choose an Avatar Preset:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {PRESET_AVATARS.map((url, idx) => (
                  <Avatar
                    key={idx}
                    src={url}
                    onClick={() => setAvatarUrl(url)}
                    sx={{
                      width: 42,
                      height: 42,
                      cursor: 'pointer',
                      border: avatarUrl === url ? '2px solid var(--accent-pink)' : '2px solid transparent',
                      transform: avatarUrl === url ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Username / Display Name"
                  fullWidth
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email Address"
                  fullWidth
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={savingProfile}
                startIcon={<SaveIcon />}
                sx={{ backgroundColor: 'var(--accent-primary)', fontWeight: 700, px: 4, py: 1.2 }}
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>

      {/* SECTION 2: SECURITY & PASSWORD */}
      <Paper className="glass-panel" sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          🔒 Security & Password
        </Typography>

        <form onSubmit={handlePasswordChange}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Current Password"
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="New Password"
                  type="password"
                  fullWidth
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Confirm New Password"
                  type="password"
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={savingPassword}
                startIcon={<LockResetIcon />}
                sx={{ backgroundColor: 'var(--accent-secondary)', fontWeight: 700, px: 4, py: 1.2 }}
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>

      {/* PLAYBACK PREFERENCES */}
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

      {/* SECTION 3: DANGER ZONE (DELETE ACCOUNT) */}
      <Paper
        sx={{
          p: 4,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#ef4444', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon /> Danger Zone
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
          Permanently delete your user account and erase all associated playlists, playback history, and saved favorites.
        </Typography>
        <Button
          variant="contained"
          color="error"
          onClick={() => setOpenConfirmDelete(true)}
          startIcon={<DeleteForeverIcon />}
          sx={{ backgroundColor: '#ef4444', fontWeight: 700, px: 3, '&:hover': { backgroundColor: '#dc2626' } }}
        >
          Delete Account
        </Button>
      </Paper>

      {/* DELETE ACCOUNT CONFIRMATION DIALOG MODAL */}
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
        <DialogTitle sx={{ fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon /> Delete Account Confirmation
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your playlists and favorites.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenConfirmDelete(false)} sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            variant="contained"
            color="error"
            sx={{ backgroundColor: '#ef4444', fontWeight: 700, '&:hover': { backgroundColor: '#dc2626' } }}
          >
            {isDeleting ? 'Deleting Account...' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>

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

