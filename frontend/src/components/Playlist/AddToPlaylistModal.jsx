import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Typography,
  Box
} from '@mui/material';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { getUserPlaylists, addTrackToPlaylist } from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';

const AddToPlaylistModal = ({ open, track, onClose }) => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchPlaylists();
    }
  }, [open, user]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const plList = await getUserPlaylists();
      setPlaylists(plList);
    } catch (err) {
      console.error('Failed to load user playlists', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    if (!track) return;
    setAdding(true);
    try {
      await addTrackToPlaylist(playlistId, track);
      alert('Track added to playlist successfully!');
      onClose();
    } catch (err) {
      console.error('Failed to add to playlist', err);
      alert('Error adding to playlist.');
    } finally {
      setAdding(false);
    }
  };

  if (!user) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Login Required</DialogTitle>
        <DialogContent>
          <Typography>You need to be logged in to add tracks to playlists.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { backgroundColor: 'var(--bg-card)', color: '#ffffff', borderRadius: 'var(--radius-lg)' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Add to Playlist</DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'var(--border-color)', minHeight: 200, p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: 'var(--accent-primary)' }} />
          </Box>
        ) : playlists.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Typography>You don't have any playlists yet.</Typography>
          </Box>
        ) : (
          <List>
            {playlists.map((pl) => (
              <ListItem 
                key={pl.id} 
                button 
                onClick={() => handleAddToPlaylist(pl.id)}
                disabled={adding}
                sx={{
                  '&:hover': { backgroundColor: 'var(--bg-glass-card-hover)' }
                }}
              >
                <ListItemAvatar>
                  <Avatar src={pl.cover_url} variant="rounded">
                    <LibraryMusicIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={pl.title} 
                  secondary={pl.is_public ? 'Public' : 'Private'}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'var(--text-secondary)' }} disabled={adding}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddToPlaylistModal;
