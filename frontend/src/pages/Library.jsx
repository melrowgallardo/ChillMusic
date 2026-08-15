import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Grid, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { getUserFavorites, getUserPlaylists, getHistory, toggleFavorite } from '../services/firestoreService';
import TrackList from '../components/Track/TrackList';
import PlaylistCard from '../components/Playlist/PlaylistCard';
import CreatePlaylistModal from '../components/Playlist/CreatePlaylistModal';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { getLocalDownloads, removeLocalDownload } from '../services/offlineSync';

const tabKeys = ['favorites', 'playlists', 'history', 'downloads'];
const tabIndexMap = { favorites: 0, playlists: 1, history: 2, downloads: 3 };

const Library = () => {
  const { user } = useAuth();
  const { playTrack, recentlyPlayed } = usePlayer();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const tabParam = searchParams.get('tab');

  const getInitialTab = () => {
    if (tabParam && tabIndexMap[tabParam] !== undefined) {
      return tabIndexMap[tabParam];
    }
    if (location.pathname === '/favorites') return 0;
    if (location.pathname === '/recently-played') return 2;
    if (location.pathname === '/downloads') return 3;
    return 0;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [history, setHistory] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    const currentTab = getInitialTab();
    setActiveTab(currentTab);
  }, [tabParam, location.pathname]);

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
    setSearchParams({ tab: tabKeys[newValue] }, { replace: true });
  };

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
          getHistory(50).catch(() => []),
          getLocalDownloads().catch(() => []),
        ]);

        setFavorites(favData || []);
        setPlaylists(plData || []);
        setHistory(histData || []);

        const mergedMap = new Map();
        (localDls || []).forEach((d) => mergedMap.set(String(d.song_id || d.id), d));
        setDownloads(Array.from(mergedMap.values()));
      } catch (err) {
        console.error('Failed to fetch library data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLibraryData();
  }, [user]);

  if (!user && (!recentlyPlayed || recentlyPlayed.length === 0)) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Please log in to view your library.
        </Typography>
      </Box>
    );
  }

  if (loading) return <LoadingSpinner message="Loading your library..." />;

  // Normalize track data
  const favoriteTracks = favorites.map((fav) => ({
    id: fav.item_id || fav.id,
    title: fav.title || fav.song_title || 'Unknown Title',
    artist_name: fav.artist_name || fav.subtitle || 'Artist',
    album_name: fav.album_name || fav.album || 'Single',
    image_url: fav.image_url || fav.cover_url || fav.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80',
    audio_url: fav.audio_url,
    duration: fav.duration || 180,
  }));

  const rawHistory = [...(recentlyPlayed || []), ...(history || [])];
  const seenHistIds = new Set();
  const historyTracks = [];
  for (const h of rawHistory) {
    const hid = h.song_id || h.id;
    if (!hid || seenHistIds.has(String(hid))) continue;
    seenHistIds.add(String(hid));
    historyTracks.push({
      id: hid,
      title: h.song_title || h.title || 'Unknown Title',
      artist_name: h.artist_name || h.subtitle || h.artist || 'Artist',
      album_name: h.album_name || h.album || 'Single',
      image_url: h.image_url || h.cover_url || h.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80',
      audio_url: h.audio_url || h.audioUrl,
      duration: h.duration || 180,
    });
  }

  const downloadTracks = downloads.map((d) => ({
    id: d.song_id || d.id,
    title: d.song_title || d.title || 'Unknown Title',
    artist_name: d.artist_name || d.subtitle || 'Artist',
    album_name: d.album_name || d.album || 'Single',
    image_url: d.image_url || d.cover_url || d.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80',
    audio_url: d.audio_url,
    duration: d.duration || 180,
  }));

  const handlePlayAll = (trackList) => {
    if (trackList && trackList.length > 0) {
      playTrack(trackList[0], trackList, 0);
    }
  };

  const handleShuffle = (trackList) => {
    if (trackList && trackList.length > 0) {
      const shuffled = [...trackList].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled, 0);
    }
  };

  const handleRemoveFavorite = async (track) => {
    try {
      await toggleFavorite(track);
      setFavorites((prev) => prev.filter((f) => String(f.item_id || f.id) !== String(track.id)));
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const handleRemoveDownload = async (track) => {
    try {
      await removeLocalDownload(track.id);
      setDownloads((prev) => prev.filter((d) => String(d.song_id || d.id) !== String(track.id)));
    } catch (err) {
      console.error('Failed to remove download:', err);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Your Library
        </Typography>

        {activeTab === 0 && favoriteTracks.length > 0 && (
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => handlePlayAll(favoriteTracks)}
              sx={{ backgroundColor: 'var(--accent-primary)', fontWeight: 700 }}
            >
              Play All
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShuffleIcon />}
              onClick={() => handleShuffle(favoriteTracks)}
              sx={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontWeight: 700 }}
            >
              Shuffle
            </Button>
          </Stack>
        )}

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

        {activeTab === 2 && historyTracks.length > 0 && (
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => handlePlayAll(historyTracks)}
            sx={{ backgroundColor: 'var(--accent-primary)', fontWeight: 700 }}
          >
            Replay All
          </Button>
        )}

        {activeTab === 3 && downloadTracks.length > 0 && (
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => handlePlayAll(downloadTracks)}
            sx={{ backgroundColor: 'var(--accent-primary)', fontWeight: 700 }}
          >
            Play Offline
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
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
        {activeTab === 0 && <TrackList tracks={favoriteTracks} onRemoveTrack={handleRemoveFavorite} />}

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

        {activeTab === 3 && <TrackList tracks={downloadTracks} onRemoveTrack={handleRemoveDownload} />}
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
