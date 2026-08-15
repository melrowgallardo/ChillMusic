import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { usePlayer } from '../context/PlayerContext';
import { getLocalDownloads, removeLocalDownload } from '../services/offlineSync';
import TrackList from '../components/Track/TrackList';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const Downloads = () => {
  const { playTrack } = usePlayer();
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDownloadsData = async () => {
    setLoading(true);
    try {
      const data = await getLocalDownloads();
      // Deduplicate downloads by song_id
      const mergedMap = new Map();
      (data || []).forEach((d) => mergedMap.set(String(d.song_id || d.id), d));
      setDownloads(Array.from(mergedMap.values()));
    } catch (err) {
      console.error('Failed to load local downloads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDownloadsData();
  }, []);

  // Normalize downloads into track objects
  const downloadTracks = downloads.map((d) => ({
    id: d.song_id || d.id,
    title: d.song_title || d.title || 'Unknown Title',
    artist_name: d.artist_name || d.subtitle || 'Artist',
    album_name: d.album_name || d.album || 'Single',
    image_url: d.image_url || d.cover_url || d.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    audio_url: d.audio_url,
    duration: d.duration || 180,
    downloaded_at: d.downloaded_at,
  }));

  const handlePlayAll = () => {
    if (downloadTracks.length > 0) {
      playTrack(downloadTracks[0], downloadTracks, 0);
    }
  };

  const handleRemoveDownload = async (track) => {
    const songId = track.id;
    try {
      await removeLocalDownload(songId);
      setDownloads((prev) => prev.filter((d) => String(d.song_id || d.id) !== String(songId)));
    } catch (err) {
      console.error('Failed to remove download:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading downloaded tracks..." />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* Header Banner */}
      <Paper
        className="glass-card"
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(124, 58, 237, 0.2) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
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
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
          }}
        >
          <DownloadIcon sx={{ fontSize: 44, color: '#ffffff' }} />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Offline Storage
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)', mt: 0.5, mb: 1 }}>
            Downloads
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            Locally saved tracks available for offline listening ({downloadTracks.length} {downloadTracks.length === 1 ? 'track' : 'tracks'})
          </Typography>
        </Box>

        {downloadTracks.length > 0 && (
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
            Play Offline
          </Button>
        )}
      </Paper>

      {/* Main Track List */}
      {downloadTracks.length > 0 ? (
        <TrackList tracks={downloadTracks} onRemoveTrack={handleRemoveDownload} />
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
          <DownloadIcon sx={{ fontSize: 56, color: 'var(--text-muted)', opacity: 0.6 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            No Downloaded Tracks
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-muted)', maxWidth: 400 }}>
            Click the download button on any track options menu to store songs locally for offline listening.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Downloads;
