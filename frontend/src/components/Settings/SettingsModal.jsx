import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Grid,
  CircularProgress,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';


const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=ChillVibes1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=MusicLover2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=LofiBeats3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SonicMaster4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=GrooveAgent5',
];

const SettingsModal = ({ open, onClose, user: propUser, updateUserProfile, changePassword, deleteAccount: propDeleteAccount, showToast }) => {
  const navigate = useNavigate();
  const auth = useAuth() || {};
  const user = propUser || auth.user;
  const deleteAccount = propDeleteAccount || auth.deleteAccount;

  const [activeTab, setActiveTab] = useState(0);


  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || user.displayName || '');
      setEmail(user.email || '');
      setAvatarUrl(user.avatar_url || user.avatar || user.photoURL || PRESET_AVATARS[0]);
    }
  }, [user, open]);

  const handleAvatarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      if (showToast) showToast('Image file size must be under 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setAvatarUrl(reader.result);
        if (showToast) showToast('Custom photo preview ready. Click Save Changes to apply!', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      if (showToast) showToast('Username cannot be empty', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      if (showToast) showToast('Please enter a valid email address', 'error');
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
      if (showToast) showToast('Account details updated successfully!', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
      if (showToast) showToast(err.message || 'Failed to update account details.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      if (showToast) showToast('Please enter a new password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      if (showToast) showToast('New password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      if (showToast) showToast('New password and confirm password do not match', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (showToast) showToast('Password updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update password:', err);
      if (showToast) showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePermanentDelete = async (e) => {
    if (e) e.preventDefault();
    setIsDeleting(true);
    try {
      if (typeof deleteAccount === 'function') {
        await deleteAccount();
      } else {
        // Immediate hard fallback wipe
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || '';
        if (token && apiUrl) {
          await fetch(`${apiUrl}/api/auth/delete-account`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }).catch((err) => console.warn('API wipe error:', err));
        }
      }
    } catch (err) {
      console.error('Permanent delete error:', err);
    } finally {
      // Hard wipe all storage keys
      localStorage.clear();
      sessionStorage.clear();
      // Force browser navigation to login page
      window.location.href = '/login';
    }
  };



  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'var(--bg-surface, #18181b)',
            color: 'var(--text-primary, #ffffff)',
            borderRadius: 'var(--radius-lg, 16px)',
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            ⚙️ Account Settings
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          textColor="inherit"
          indicatorColor="primary"
          variant="fullWidth"
          sx={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))', mb: 2 }}
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="Edit Profile" />
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" />
          <Tab icon={<WarningAmberIcon color="error" />} iconPosition="start" label="Danger Zone" sx={{ color: '#ef4444' }} />
        </Tabs>

        <DialogContent sx={{ py: 1 }}>
          {/* TAB 0: EDIT PROFILE */}
          {activeTab === 0 && (
            <form onSubmit={handleProfileSave}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Avatar
                      src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
                      sx={{
                        width: 100,
                        height: 100,
                        border: '3px solid var(--accent-primary, #7c3aed)',
                        boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
                      }}
                    />
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="modal-avatar-upload"
                      type="file"
                      onChange={handleAvatarFileUpload}
                    />
                    <label htmlFor="modal-avatar-upload">
                      <IconButton
                        component="span"
                        size="small"
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          backgroundColor: 'var(--accent-primary, #7c3aed)',
                          color: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                          '&:hover': { backgroundColor: 'var(--accent-pink, #ec4899)' },
                        }}
                      >
                        <PhotoCameraIcon fontSize="small" />
                      </IconButton>
                    </label>
                  </Box>

                  <Button
                    variant="outlined"
                    component="label"
                    htmlFor="modal-avatar-upload"
                    size="small"
                    startIcon={<PhotoCameraIcon />}
                    sx={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', fontWeight: 600 }}
                  >
                    Upload Custom Photo
                  </Button>

                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                    Or choose an Avatar Preset:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {PRESET_AVATARS.map((url, idx) => (
                      <Avatar
                        key={idx}
                        src={url}
                        onClick={() => setAvatarUrl(url)}
                        sx={{
                          width: 40,
                          height: 40,
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
                  <Grid item xs={12}>
                    <TextField
                      label="Username / Display Name"
                      fullWidth
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Email Address"
                      fullWidth
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={savingProfile}
                    startIcon={<SaveIcon />}
                    sx={{ backgroundColor: 'var(--accent-primary, #7c3aed)', fontWeight: 700, px: 4 }}
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </Button>
                </Box>
              </Box>
            </form>
          )}

          {/* TAB 1: SECURITY & PASSWORD */}
          {activeTab === 1 && (
            <form onSubmit={handlePasswordChange}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
                <TextField
                  label="Current Password"
                  type="password"
                  fullWidth
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <TextField
                  label="New Password"
                  type="password"
                  fullWidth
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={savingPassword}
                    startIcon={<LockResetIcon />}
                    sx={{ backgroundColor: 'var(--accent-secondary, #ec4899)', fontWeight: 700, px: 4 }}
                  >
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
                </Box>
              </Box>
            </form>
          )}

          {/* TAB 2: DANGER ZONE */}
          {activeTab === 2 && (
            <Paper
              sx={{
                p: 3,
                mt: 1,
                borderRadius: 'var(--radius-lg, 12px)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#ef4444', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon /> Danger Zone
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3, lineHeight: 1.6 }}>
                Permanently delete your user account and remove all associated playlists, playback history, and saved favorites.
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
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <Dialog
        open={openConfirmDelete}
        onClose={() => !isDeleting && setOpenConfirmDelete(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--bg-surface, #18181b)',
            color: 'var(--text-primary, #ffffff)',
            borderRadius: 'var(--radius-md, 12px)',
            p: 1,
            maxWidth: 460,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon /> Confirm Permanent Deletion
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to permanently delete your account? All your saved tracks and playlists will be lost forever.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenConfirmDelete(false)} disabled={isDeleting} sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handlePermanentDelete}
            disabled={isDeleting}
            className="delete-confirm-btn"
            style={{
              cursor: 'pointer',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isDeleting ? 0.7 : 1,
            }}
          >
            {isDeleting ? 'Deleting...' : '🗑️ YES, DELETE MY ACCOUNT'}
          </button>
        </DialogActions>
      </Dialog>


    </>
  );
};


export default SettingsModal;
