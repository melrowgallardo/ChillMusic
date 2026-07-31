import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Switch, FormControlLabel } from '@mui/material';
import { updatePlaylist } from '../../services/firestoreService';

const EditPlaylistModal = ({ open, playlist, onClose, onUpdated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (playlist) {
      setTitle(playlist.title || '');
      setDescription(playlist.description || '');
      setCoverUrl(playlist.cover_url || '');
      setIsPublic(playlist.is_public ?? true);
    }
  }, [playlist]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playlist || !title.trim()) return;

    setLoading(true);
    try {
      const res = await updatePlaylist(playlist.id, {
        title: title.trim(),
        description: description.trim() || null,
        cover_url: coverUrl.trim() || null,
        is_public: isPublic,
      });
      if (onUpdated) onUpdated(res);
      onClose();
    } catch (err) {
      console.error('Failed to update playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ className: 'glass-panel', sx: { p: 1 } }}>
      <DialogTitle sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>Edit Playlist</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Playlist Title"
              fullWidth
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TextField
              label="Cover Image URL"
              fullWidth
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
            <FormControlLabel
              control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} color="primary" />}
              label="Public Playlist"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} sx={{ color: 'var(--text-muted)' }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading} sx={{ backgroundColor: 'var(--accent-primary)' }}>
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditPlaylistModal;
