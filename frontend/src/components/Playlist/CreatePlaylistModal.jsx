import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Switch, FormControlLabel } from '@mui/material';
import { createPlaylist } from '../../services/firestoreService';
import { useOffline } from '../../context/OfflineContext';
import { enqueueOfflineAction } from '../../services/offlineSync';

const CreatePlaylistModal = ({ open, onClose, onCreated }) => {
  const { isOnline } = useOffline();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      cover_url: coverUrl.trim() || null,
      is_public: isPublic,
    };

    if (isOnline) {
      try {
        const newPl = await createPlaylist(title.trim(), description.trim() || '', isPublic);
        if (onCreated) onCreated(newPl);
      } catch (err) {
        console.error('Failed to create playlist online:', err);
      }
    } else {
      await enqueueOfflineAction('CREATE_PLAYLIST', payload);
      if (onCreated) onCreated({ ...payload, id: `offline-${Date.now()}`, songs: [] });
    }

    setLoading(false);
    setTitle('');
    setDescription('');
    setCoverUrl('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ className: 'glass-panel', sx: { p: 1 } }}>
      <DialogTitle sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>Create Playlist</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Playlist Title"
              fullWidth
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
            />
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TextField
              label="Cover Image URL (optional)"
              fullWidth
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
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
          <Button type="submit" variant="contained" disabled={loading} sx={{ backgroundColor: 'var(--accent-primary)', '&:hover': { backgroundColor: '#6d28d9' } }}>
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreatePlaylistModal;
