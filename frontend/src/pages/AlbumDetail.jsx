import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Avatar } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getAlbumDetails } from '../services/jamendo';
import TrackList from '../components/Track/TrackList';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { usePlayer } from '../context/PlayerContext';
import { normalizeTrack } from '../utils/trackUtils';

const AlbumDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, togglePlayPause, playTrack } = usePlayer();

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAlbumDetails = async () => {
      setError('');

      // 1. Check if location.state contains album with valid tracks
      const passedAlbum = location.state?.album;
      if (passedAlbum && Array.isArray(passedAlbum.tracks) && passedAlbum.tracks.length > 0) {
        const normalizedTracks = passedAlbum.tracks.map(normalizeTrack);
        setAlbum({
          ...passedAlbum,
          tracks: normalizedTracks,
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      const cleanId = String(id || '').replace('it_', '').replace('dz_', '').replace('saavn_alb_', '');

      // 2. Fetch direct from iTunes Lookup API: https://itunes.apple.com/lookup?id=${id}&entity=song
      try {
        const res = await fetch(`https://itunes.apple.com/lookup?id=${cleanId}&entity=song`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const albumInfo = data.results[0]; // Collection header info
            const tracks = data.results.slice(1).map((track) =>
              normalizeTrack({
                id: String(track.trackId || track.id || Math.random()),
                title: track.trackName || track.title || 'Unknown Track',
                artist: track.artistName || albumInfo.artistName || 'Unknown Artist',
                artist_name: track.artistName || albumInfo.artistName || 'Unknown Artist',
                album: track.collectionName || albumInfo.collectionName || 'Album',
                album_name: track.collectionName || albumInfo.collectionName || 'Album',
                cover: (track.artworkUrl100 || albumInfo.artworkUrl100 || '').replace('100x100bb', '500x500bb'),
                duration: track.trackTimeMillis ? Math.floor(track.trackTimeMillis / 1000) : 180,
                audioUrl: track.previewUrl || track.audioUrl || track.streamUrl || '',
                previewUrl: track.previewUrl || '',
                source: 'itunes',
              })
            );

            setAlbum({
              id: albumInfo.collectionId || cleanId,
              title: albumInfo.collectionName || passedAlbum?.title || 'Unknown Album',
              name: albumInfo.collectionName || passedAlbum?.name || 'Unknown Album',
              artist: albumInfo.artistName || passedAlbum?.artist || 'Various Artists',
              artist_name: albumInfo.artistName || passedAlbum?.artist_name || 'Various Artists',
              cover: (albumInfo.artworkUrl100 || passedAlbum?.coverUrl || passedAlbum?.image || '').replace('100x100bb', '500x500bb'),
              image: (albumInfo.artworkUrl100 || passedAlbum?.coverUrl || passedAlbum?.image || '').replace('100x100bb', '500x500bb'),
              releaseDate: albumInfo.releaseDate?.split('-')[0] || passedAlbum?.releaseDate || 'Recent',
              tracks: tracks,
            });
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('iTunes lookup fetch failed, trying fallback details service:', err);
      }

      // 3. Fallback to Jamendo / Deezer / Backend getAlbumDetails
      try {
        const fallbackData = await getAlbumDetails(id);
        if (fallbackData && (fallbackData.name || fallbackData.title)) {
          const normTracks = (fallbackData.tracks || []).map(normalizeTrack);
          setAlbum({
            ...fallbackData,
            tracks: normTracks,
          });
          setLoading(false);
          return;
        }
      } catch (fallbackErr) {
        console.error('Error fetching fallback album details:', fallbackErr);
      }

      setError('Album not found.');
      setLoading(false);
    };

    if (id) fetchAlbumDetails();
  }, [id, location.state]);

  if (loading) return <LoadingSpinner message="Loading album..." />;

  if (error || !album) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ color: 'var(--text-muted)', fontWeight: 700 }}>
          {error || 'Album not found.'}
        </Typography>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
          Back to Search
        </Button>
      </Box>
    );
  }

  const title = album.title || album.name || 'Unknown Album';
  const artist = album.artist || album.artist_name || 'Various Artists';
  const cover = album.cover || album.image || album.coverUrl || album.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80';
  const releaseYear = album.releaseDate || album.releasedate || album.release_date || 'Recent';
  const tracksList = album.tracks || [];

  const isCurrentAlbum = tracksList.some(
    (t) => String(t.id) === String(currentTrack?.id) || (t.title === currentTrack?.title && t.artist_name === currentTrack?.artist_name)
  );
  const isCurrentAlbumPlaying = isPlaying && isCurrentAlbum;

  const handleTogglePlayAlbum = () => {
    if (!tracksList || tracksList.length === 0) return;

    if (isCurrentAlbumPlaying) {
      togglePlayPause();
    } else if (isCurrentAlbum) {
      togglePlayPause();
    } else {
      playTrack(tracksList[0], tracksList, 0);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Header Bar */}
      <Box className="glass-panel" sx={{ p: 4, display: 'flex', gap: 4, alignItems: 'flex-end', flexDirection: { xs: 'column', md: 'row' } }}>
        <Avatar
          src={cover}
          variant="rounded"
          sx={{ width: 200, height: 200, borderRadius: 'var(--radius-md)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--accent-secondary)', fontWeight: 700 }}>
            ALBUM
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, my: 1, fontFamily: 'var(--font-heading)' }}>
            {title}
          </Typography>
          <Typography variant="h6" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
            By {artist} • Released {releaseYear} • {tracksList.length} Tracks
          </Typography>

          {tracksList.length > 0 && (
            <Button
              variant="contained"
              startIcon={isCurrentAlbumPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              onClick={handleTogglePlayAlbum}
              sx={{ backgroundColor: 'var(--accent-primary)', borderRadius: 'var(--radius-full)', px: 4, py: 1, fontWeight: 700, '&:hover': { backgroundColor: '#6d28d9' } }}
            >
              {isCurrentAlbumPlaying ? 'PAUSE' : isCurrentAlbum ? 'RESUME' : 'PLAY ALBUM'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Tracklist Table */}
      <TrackList tracks={tracksList} />
    </Box>
  );
};

export default AlbumDetail;
