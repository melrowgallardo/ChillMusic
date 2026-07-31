import React from 'react';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ExploreIcon from '@mui/icons-material/Explore';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTrack } = usePlayer();

  const getActiveValue = () => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path === '/search') return 1;
    if (path === '/explore') return 2;
    if (path.startsWith('/library')) return 3;
    if (path.startsWith('/profile')) return 4;
    return 0;
  };

  return (
    <Paper
      elevation={10}
      sx={{
        position: 'fixed',
        bottom: currentTrack ? 'var(--player-height)' : 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        display: { xs: 'block', md: 'none' },
        backgroundColor: 'var(--bg-surface)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-color)',
        transition: 'bottom 0.2s',
      }}
    >
      <BottomNavigation
        showLabels
        value={getActiveValue()}
        onChange={(_, newValue) => {
          const paths = ['/', '/search', '/explore', '/library', '/profile'];
          navigate(paths[newValue]);
        }}
        sx={{
          backgroundColor: 'transparent',
          height: 'calc(60px + env(safe-area-inset-bottom))',
          pb: 'env(safe-area-inset-bottom)',
          '& .MuiBottomNavigationAction-root': {
            color: 'var(--text-muted)',
            minWidth: 'auto',
            py: 1,
            '&.Mui-selected': {
              color: 'var(--accent-primary)',
              '& .MuiSvgIcon-root': {
                filter: 'drop-shadow(0 0 8px var(--accent-glow))',
              },
            },
          },
        }}
      >
        <BottomNavigationAction label="Home" icon={<HomeIcon />} />
        <BottomNavigationAction label="Search" icon={<SearchIcon />} />
        <BottomNavigationAction label="Explore" icon={<ExploreIcon />} />
        <BottomNavigationAction label="Library" icon={<LibraryMusicIcon />} />
        <BottomNavigationAction label="Profile" icon={<AccountCircleIcon />} />
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNav;
