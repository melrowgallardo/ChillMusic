import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ExploreIcon from '@mui/icons-material/Explore';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import AddIcon from '@mui/icons-material/Add';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HistoryIcon from '@mui/icons-material/History';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CreatePlaylistModal from '../Playlist/CreatePlaylistModal';
import { getUserPlaylists } from '../../services/firestoreService';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      getUserPlaylists()
        .then((res) => setUserPlaylists(res))
        .catch((err) => console.warn('Failed to load user playlists:', err));
    } else {
      setUserPlaylists([]);
    }
  }, [user]);

  const navItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'Search', path: '/search', icon: <SearchIcon /> },
    { label: 'Explore', path: '/explore', icon: <ExploreIcon /> },
    { label: 'Your Library', path: '/library', icon: <LibraryMusicIcon /> },
  ];

  const libraryQuickLinks = [
    { label: 'Favorites', path: '/library?tab=favorites', icon: <FavoriteIcon sx={{ color: 'var(--accent-pink)' }} /> },
    { label: 'Recently Played', path: '/library?tab=history', icon: <HistoryIcon sx={{ color: 'var(--accent-secondary)' }} /> },
    { label: 'Downloads', path: '/library?tab=downloads', icon: <DownloadIcon sx={{ color: '#10b981' }} /> },
  ];

  return (
    <Box
      sx={{
        width: 'var(--sidebar-width)',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        zIndex: 1000,
        px: 2,
        py: 3,
      }}
    >
      {/* Brand Logo */}
      <Box
        onClick={() => navigate('/')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          px: 1,
          mb: 4,
        }}
      >
        <Box
          component="img"
          src="/logo.png"
          alt="ChillMusic Logo"
          sx={{
            width: 44,
            height: 44,
            objectFit: 'contain',
            borderRadius: '50%',
            boxShadow: '0 0 15px var(--accent-glow)',
          }}
        />
        <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }} className="text-gradient">
          ChillMusic
        </Typography>
      </Box>

      {/* Main Nav */}
      <List sx={{ px: 0 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem disablePadding key={item.path} sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  '&:hover': {
                    backgroundColor: 'var(--bg-glass-card-hover)',
                    color: 'var(--text-primary)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

      {/* Library Quick Links */}
      {user && (
        <>
          <Typography variant="caption" sx={{ px: 1.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1 }}>
            QUICK ACCESS
          </Typography>
          <List sx={{ px: 0, mt: 1 }}>
            {libraryQuickLinks.map((item) => (
              <ListItem disablePadding key={item.path} sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    '&:hover': { backgroundColor: 'var(--bg-glass-card-hover)', color: 'var(--text-primary)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

          {/* User Playlists */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1 }}>
              PLAYLISTS
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
              sx={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Create
            </Button>
          </Box>

          <Box className="custom-scroll" sx={{ flex: 1, overflowY: 'auto' }}>
            <List sx={{ px: 0 }}>
              {userPlaylists.map((pl) => (
                <ListItem disablePadding key={pl.id}>
                  <ListItemButton
                    onClick={() => navigate(`/playlist/${pl.id}`)}
                    sx={{
                      borderRadius: 'var(--radius-sm)',
                      py: 0.8,
                      color: 'var(--text-secondary)',
                      '&:hover': { color: 'var(--text-primary)' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: 'var(--text-muted)' }}>
                      <QueueMusicIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={pl.title} primaryTypographyProps={{ noWrap: true, variant: 'body2' }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </>
      )}

      <CreatePlaylistModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(newPl) => setUserPlaylists((prev) => [newPl, ...prev])}
      />
    </Box>
  );
};

export default Sidebar;
