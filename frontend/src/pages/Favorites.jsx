import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack, Paper } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { getUserFavorites, toggleFavorite } from '../services/firestoreService';
import TrackList from '../components/Track/TrackList';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const Favorites = () => {
  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const data = await getUserFavorites();
      setFavorites(data || []);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [user]);

  // Normalize favorites into track format
  const favoriteTracks = favorites.map((fav) => ({
    id: fav.item_id || fav.id,
    title: fav.title || fav.song_title || 'Unknown Title',
    artist_name: fav.artist_name || fav.subtitle || 'Artist',
    album_name: fav.album_name || fav.album || 'Single',
    image_url: fav.image_url || fav.cover_url || fav.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    audio_url: fav.audio_url,
    duration: fav.duration || 180,
  }));

  const handlePlayAll = () => {
    if (favoriteTracks.length > 0) {
      playTrack(favoriteTracks[0], favoriteTracks, 0);
    }
  };

  const handleShuffle = () => {
    if (favoriteTracks.length > 0) {
      const shuffled = [...favoriteTracks].sort(() => Math.random() - 0.5);
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

  if (loading) {
    return <LoadingSpinner message="Loading your favorited tracks..." />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* Header Banner */}
      <Paper
        className="glass-card"
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(124, 58, 237, 0.2) 100%)',
          border: '1px solid rgba(236, 72, 153, 0.3)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 3,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(236, 72, 153, 0.4)',
          }}
        >
          <FavoriteIcon sx={{ fontSize: 44, color: '#ffffff' }} />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'var(--accent-pink)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Playlist
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)', mt: 0.5, mb: 1 }}>
            Liked Songs
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            {favoriteTracks.length} {favoriteTracks.length === 1 ? 'track' : 'tracks'} favorited
          </Typography>
        </Box>

        {favoriteTracks.length > 0 && (
          <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handlePlayAll}
              sx={{
                backgroundColor: 'var(--accent-primary)',
                fontWeight: 700,
                px: 3,
                py: 1.2,
                borderRadius: 'var(--radius-md)',
                '&:hover': { backgroundColor: 'var(--accent-secondary)' },
              }}
            >
              Play All
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShuffleIcon />}
              onClick={handleShuffle}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontWeight: 700,
                px: 2.5,
                py: 1.2,
                borderRadius: 'var(--radius-md)',
                '&:hover': { borderColor: 'var(--accent-pink)', backgroundColor: 'rgba(236, 72, 153, 0.1)' },
              }}
            >
              Shuffle
            </Button>
          </Stack>
        )}
      </Paper>

      {/* Main Track List */}
      {favoriteTracks.length > 0 ? (
        <TrackList tracks={favoriteTracks} onRemoveTrack={handleRemoveFavorite} />
      ) : (
        <Paper
          className="glass-card"
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <FavoriteIcon sx={{ fontSize: 56, color: 'var(--text-muted)', opacity: 0.6 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            No Favorites Yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-muted)', maxWidth: 400 }}>
            Click the heart icon on any song to save it to your Favorites for quick listening anytime!
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Favorites;
