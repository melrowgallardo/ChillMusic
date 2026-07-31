import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Avatar } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useParams } from 'react-router-dom';
import { getAlbumDetails } from '../services/jamendo';
import TrackList from '../components/Track/TrackList';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { usePlayer } from '../context/PlayerContext';

const AlbumDetail = () => {
  const { id } = useParams();
  const { playTrack } = usePlayer();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbum = async () => {
      setLoading(true);
      try {
        const data = await getAlbumDetails(id);
        setAlbum(data);
      } catch (err) {
        console.error('Failed to load album:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbum();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading album..." />;
  if (!album) return <Typography>Album not found.</Typography>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box className="glass-panel" sx={{ p: 4, display: 'flex', gap: 4, alignItems: 'flex-end', flexDirection: { xs: 'column', md: 'row' } }}>
        <Avatar
          src={album.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80'}
          variant="rounded"
          sx={{ width: 200, height: 200, borderRadius: 'var(--radius-md)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--accent-secondary)', fontWeight: 700 }}>
            ALBUM
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, my: 1, fontFamily: 'var(--font-heading)' }}>
            {album.name}
          </Typography>
          <Typography variant="h6" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
            By {album.artist_name} • Released {album.releasedate || 'Recent'}
          </Typography>

          {album.tracks && album.tracks.length > 0 && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => playTrack(album.tracks[0], album.tracks, 0)}
              sx={{ backgroundColor: 'var(--accent-primary)', borderRadius: 'var(--radius-full)', px: 4, py: 1, fontWeight: 700 }}
            >
              Play Album
            </Button>
          )}
        </Box>
      </Box>

      <TrackList tracks={album.tracks || []} />
    </Box>
  );
};

export default AlbumDetail;
