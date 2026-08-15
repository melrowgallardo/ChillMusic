import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack, Paper } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { getHistory } from '../services/firestoreService';
import TrackList from '../components/Track/TrackList';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const RecentlyPlayed = () => {
  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistoryData = async () => {
    setLoading(true);
    try {
      const data = await getHistory(50);
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load listening history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, [user]);

  // Normalize history entries into track objects
  const historyTracks = history.map((h) => ({
    id: h.song_id || h.id,
    title: h.song_title || h.title || 'Unknown Title',
    artist_name: h.artist_name || h.subtitle || 'Artist',
    album_name: h.album_name || h.album || 'Single',
    image_url: h.image_url || h.cover_url || h.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    audio_url: h.audio_url,
    duration: h.duration || 180,
    playedAt: h.playedAt,
  }));

  const handlePlayAll = () => {
    if (historyTracks.length > 0) {
      playTrack(historyTracks[0], historyTracks, 0);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading recently played tracks..." />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* Header Banner */}
      <Paper
        className="glass-card"
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(124, 58, 237, 0.2) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
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
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
          }}
        >
          <HistoryIcon sx={{ fontSize: 44, color: '#ffffff' }} />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'var(--accent-secondary)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            History
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)', mt: 0.5, mb: 1 }}>
            Recently Played
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            Your recent listening trajectory ({historyTracks.length} {historyTracks.length === 1 ? 'track' : 'tracks'})
          </Typography>
        </Box>

        {historyTracks.length > 0 && (
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
              width: { xs: '100%', sm: 'auto' },
              '&:hover': { backgroundColor: 'var(--accent-secondary)' },
            }}
          >
            Replay All
          </Button>
        )}
      </Paper>

      {/* Main Track List */}
      {historyTracks.length > 0 ? (
        <TrackList tracks={historyTracks} />
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
          <HistoryIcon sx={{ fontSize: 56, color: 'var(--text-muted)', opacity: 0.6 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            No Recently Played Tracks
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-muted)', maxWidth: 400 }}>
            Play songs across ChillMusic to build your history log here.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default RecentlyPlayed;
