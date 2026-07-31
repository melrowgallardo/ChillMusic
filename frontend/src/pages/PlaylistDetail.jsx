import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Avatar, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlaylistDetails } from '../services/jamendo';
import { getPlaylistDetail, deletePlaylist } from '../services/firestoreService';
import TrackList from '../components/Track/TrackList';
import EditPlaylistModal from '../components/Playlist/EditPlaylistModal';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack } = usePlayer();
  const { user } = useAuth();

  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchPlaylist = async () => {
      setLoading(true);
      try {
        const firestorePl = await getPlaylistDetail(id);
        if (firestorePl) {
          setPlaylist(firestorePl);
          const normalizedTracks = (firestorePl.tracks || []).map((s) => ({
            id: s.id || s.song_id,
            title: s.title || s.song_title,
            artist_name: s.artist_name,
            album_name: s.album_name,
            audio_url: s.audio_url,
            image_url: s.image_url,
            duration: s.duration || 180,
          }));
          setTracks(normalizedTracks);
        } else {
          // Jamendo playlist fallback
          const data = await getPlaylistDetails(id);
          if (data) {
            setPlaylist(data);
            setTracks(data.tracks || []);
          }
        }
      } catch (err) {
        console.error('Failed to load playlist:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this playlist?')) return;
    try {
      await deletePlaylist(id);
      navigate('/library?tab=playlists');
    } catch (err) {
      console.error('Delete playlist failed:', err);
    }
  };

  if (loading) return <LoadingSpinner message="Loading playlist details..." />;
  if (!playlist) return <Typography>Playlist not found.</Typography>;

  const cover = playlist.cover_url || playlist.zip || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
  const title = playlist.title || playlist.name;
  const isOwner = user && playlist.user_id === user.id;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Playlist Header */}
      <Box
        className="glass-panel"
        sx={{
          p: 4,
          display: 'flex',
          gap: 4,
          alignItems: { xs: 'center', md: 'flex-end' },
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Avatar
          src={cover}
          variant="rounded"
          sx={{
            width: 200,
            height: 200,
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          }}
        />

        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--accent-secondary)', fontWeight: 700 }}>
            PLAYLIST
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, my: 1, fontFamily: 'var(--font-heading)' }}>
            {title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
            {playlist.description || `${tracks.length} songs available`}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {tracks.length > 0 && (
              <>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => playTrack(tracks[0], tracks, 0)}
                  sx={{ backgroundColor: 'var(--accent-primary)', borderRadius: 'var(--radius-full)', px: 3, fontWeight: 700 }}
                >
                  Play All
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<ShuffleIcon />}
                  onClick={() => {
                    const rnd = Math.floor(Math.random() * tracks.length);
                    playTrack(tracks[rnd], tracks, rnd);
                  }}
                  sx={{ borderColor: 'var(--border-color)', color: '#ffffff', borderRadius: 'var(--radius-full)', px: 3 }}
                >
                  Shuffle
                </Button>
              </>
            )}

            {isOwner && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/search')}
                  sx={{ borderColor: 'var(--border-color)', color: '#ffffff', borderRadius: 'var(--radius-full)', px: 3 }}
                >
                  Add Music
                </Button>
                <IconButton onClick={() => setEditModalOpen(true)} sx={{ color: 'var(--text-secondary)' }}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={handleDelete} sx={{ color: 'var(--accent-pink)' }}>
                  <DeleteIcon />
                </IconButton>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Track List */}
      <TrackList tracks={tracks} />

      {isOwner && (
        <EditPlaylistModal
          open={editModalOpen}
          playlist={playlist}
          onClose={() => setEditModalOpen(false)}
          onUpdated={(updated) => {
            setPlaylist(updated);
          }}
        />
      )}
    </Box>
  );
};

export default PlaylistDetail;
