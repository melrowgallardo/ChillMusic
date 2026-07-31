import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Grid, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserFavorites, getUserPlaylists, getHistory } from '../services/firestoreService';
import TrackList from '../components/Track/TrackList';
import PlaylistCard from '../components/Playlist/PlaylistCard';
import CreatePlaylistModal from '../components/Playlist/CreatePlaylistModal';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { getLocalDownloads } from '../services/offlineSync';

const Library = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const tabIndexMap = { favorites: 0, playlists: 1, history: 2, downloads: 3 };
  const [activeTab, setActiveTab] = useState(tabParam ? tabIndexMap[tabParam] || 0 : 0);

  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [history, setHistory] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadLibraryData = async () => {
      setLoading(true);
      try {
        const [favData, plData, histData, localDls] = await Promise.all([
          getUserFavorites().catch(() => []),
          getUserPlaylists().catch(() => []),
          getHistory().catch(() => []),
          getLocalDownloads().catch(() => []),
        ]);

        setFavorites(favData);
        setPlaylists(plData);
        setHistory(histData);

        const mergedMap = new Map();
        localDls.forEach((d) => mergedMap.set(String(d.song_id || d.id), d));
        setDownloads(Array.from(mergedMap.values()));
      } catch (err) {
        console.error('Failed to fetch library data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLibraryData();
  }, [user]);

  if (!user) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Please log in to view your library.
        </Typography>
      </Box>
    );
  }

  if (loading) return <LoadingSpinner message="Loading your library..." />;

  // Normalize favorites into track objects
  const favoriteTracks = favorites.map((fav) => ({
    id: fav.item_id,
    title: fav.title,
    artist_name: fav.subtitle || 'Artist',
    image_url: fav.image_url,
    audio_url: fav.audio_url,
    duration: 180,
  }));

  // Normalize history tracks
  const historyTracks = history.map((h) => ({
    id: h.song_id,
    title: h.song_title,
    artist_name: h.artist_name,
    album_name: h.album_name,
    image_url: h.image_url,
    audio_url: h.audio_url,
    duration: h.duration,
  }));

  // Normalize downloads
  const downloadTracks = downloads.map((d) => ({
    id: d.song_id || d.id,
    title: d.song_title || d.title,
    artist_name: d.artist_name || 'Unknown Artist',
    album_name: d.album_name || 'Single',
    image_url: d.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80',
    audio_url: d.audio_url,
    duration: d.duration || 180,
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Your Library
        </Typography>
        {activeTab === 1 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
            sx={{ backgroundColor: 'var(--accent-primary)', fontWeight: 700 }}
          >
            New Playlist
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        textColor="inherit"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: '1px solid var(--border-color)',
          '& .MuiTabs-indicator': { backgroundColor: 'var(--accent-primary)', height: 3 },
        }}
      >
        <Tab label={`Favorites (${favorites.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Playlists (${playlists.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Recently Played (${history.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Downloads (${downloads.length})`} sx={{ fontWeight: 700 }} />
      </Tabs>

      <Box sx={{ mt: 1 }}>
        {activeTab === 0 && <TrackList tracks={favoriteTracks} />}

        {activeTab === 1 && (
          <Grid container spacing={2.5}>
            {playlists.map((pl) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={pl.id}>
                <PlaylistCard playlist={pl} />
              </Grid>
            ))}
          </Grid>
        )}

        {activeTab === 2 && <TrackList tracks={historyTracks} />}

        {activeTab === 3 && <TrackList tracks={downloadTracks} />}
      </Box>

      <CreatePlaylistModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(newPl) => setPlaylists((prev) => [newPl, ...prev])}
      />
    </Box>
  );
};

export default Library;
