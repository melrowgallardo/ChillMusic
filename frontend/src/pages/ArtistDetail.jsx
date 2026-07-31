import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar, Grid, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useParams } from 'react-router-dom';
import { getArtistDetails, getArtistTracks, getArtistAlbums } from '../services/jamendo';
import TrackList from '../components/Track/TrackList';
import AlbumCard from '../components/Album/AlbumCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { usePlayer } from '../context/PlayerContext';

const ArtistDetail = () => {
  const { id } = useParams();
  const { playTrack } = usePlayer();
  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [artData, trkData, albData] = await Promise.all([
          getArtistDetails(id),
          getArtistTracks(id, 15),
          getArtistAlbums(id, 10),
        ]);
        setArtist(artData);
        setTracks(trkData);
        setAlbums(albData);
      } catch (err) {
        console.error('Failed to load artist details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading artist profile..." />;
  if (!artist) return <Typography>Artist not found.</Typography>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Artist Hero */}
      <Box
        className="glass-panel"
        sx={{
          p: 4,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Avatar
          src={artist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80'}
          alt={artist.name}
          sx={{ width: 160, height: 160, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}
        />
        <Box>
          <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--accent-secondary)', fontWeight: 700 }}>
            VERIFIED ARTIST
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, my: 1, fontFamily: 'var(--font-heading)' }}>
            {artist.name}
          </Typography>

          {tracks.length > 0 && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => playTrack(tracks[0], tracks, 0)}
              sx={{ backgroundColor: 'var(--accent-primary)', borderRadius: 'var(--radius-full)', px: 4, py: 1, fontWeight: 700, mt: 1 }}
            >
              Play Top Tracks
            </Button>
          )}
        </Box>
      </Box>

      {/* Popular Tracks */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
          Popular Tracks
        </Typography>
        <TrackList tracks={tracks} />
      </Box>

      {/* Discography / Albums */}
      {albums.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            Albums & EPs
          </Typography>
          <Grid container spacing={2.5}>
            {albums.map((alb) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={alb.id}>
                <AlbumCard album={alb} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default ArtistDetail;
