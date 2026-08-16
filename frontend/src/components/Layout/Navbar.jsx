import React, { useState } from 'react';
import { Box, IconButton, Avatar, Menu, MenuItem, Button, Tooltip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';
import { usePlayer } from '../../context/PlayerContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const { clearQueue } = usePlayer();
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <Box
      sx={{
        height: 'calc(70px + env(safe-area-inset-top))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1, sm: 2, md: 4 },
        gap: { xs: 1, sm: 2 },
        pt: 'env(safe-area-inset-top)',
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 900,
      }}
    >
      {/* Left Navigation Arrows & Search */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flex: 1, minWidth: 0, maxWidth: 500 }}>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
          <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: 'var(--text-secondary)' }}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => navigate(1)} sx={{ color: 'var(--text-secondary)' }}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Right Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <Tooltip title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} mode`}>
          <IconButton onClick={toggleTheme} sx={{ color: 'var(--text-secondary)' }}>
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings">
          <IconButton onClick={() => navigate('/settings')} sx={{ color: 'var(--text-secondary)' }}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        {user ? (
          <>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
              <Avatar
                src={user.avatar_url || user.avatar || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username || 'User'}`}
                alt={user.username || 'User Profile'}
                sx={{ width: 38, height: 38, border: '2px solid var(--accent-primary)' }}
              />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate('/settings');
                }}
              >
                <SettingsIcon sx={{ mr: 1.5, color: 'var(--text-secondary)' }} /> Profile & Settings
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  clearQueue();
                  logout();
                }}
              >
                <LogoutIcon sx={{ mr: 1.5, color: 'var(--text-secondary)' }} /> Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => navigate('/login')} sx={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              Log In
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/register')}
              sx={{
                backgroundColor: 'var(--accent-primary)',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                px: 2.5,
                '&:hover': { backgroundColor: '#6d28d9' },
              }}
            >
              Sign Up
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Navbar;
