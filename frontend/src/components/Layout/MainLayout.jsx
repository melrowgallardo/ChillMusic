import React from 'react';
import { Box } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import PersistentPlayer from '../Player/PersistentPlayer';
import QueueDrawer from '../Player/QueueDrawer';
import FullPlayerModal from '../Player/FullPlayerModal';
import OfflineBanner from '../Common/OfflineBanner';
import { usePlayer } from '../../context/PlayerContext';

import AudioPlayer from '../Player/AudioPlayer';
import MobileBottomNav from './MobileBottomNav';

const MainLayout = () => {
  const { currentTrack } = usePlayer();
  const location = useLocation();
  const hideNavRoutes = ['/login', '/register'];
  const shouldHideNav = hideNavRoutes.includes(location.pathname);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex' }}>
      <AudioPlayer />
      {!shouldHideNav && <Sidebar />}

      <Box
        sx={{
          flex: 1,
          ml: { xs: 0, md: shouldHideNav ? 0 : 'var(--sidebar-width)' },
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
          pb: {
            xs: currentTrack ? 'calc(var(--player-height) + 60px + env(safe-area-inset-bottom))' : (shouldHideNav ? 'env(safe-area-inset-bottom)' : 'calc(60px + env(safe-area-inset-bottom))'),
            md: currentTrack ? 'var(--player-height)' : 0,
          },
        }}
      >
        <OfflineBanner />
        {!shouldHideNav && <Navbar />}

        <Box component="main" sx={{ flex: 1, p: { xs: 2, sm: 3, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>

      {!shouldHideNav && <MobileBottomNav />}
      <PersistentPlayer />
      <QueueDrawer />
      <FullPlayerModal />
    </Box>
  );
};

export default MainLayout;
