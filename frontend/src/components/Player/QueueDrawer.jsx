import React from 'react';
import { Drawer, Box, Typography, IconButton, List, ListItem, ListItemAvatar, Avatar, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { usePlayer } from '../../context/PlayerContext';
import AudioVisualizer from './AudioVisualizer';

const QueueDrawer = () => {
  const { queue, currentIndex, currentTrack, isPlaying, isQueueOpen, setIsQueueOpen, playTrack, removeFromQueue, clearQueue } = usePlayer();

  return (
    <Drawer
      anchor="right"
      open={isQueueOpen}
      onClose={() => setIsQueueOpen(false)}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 380 },
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid var(--border-color)',
          padding: 2,
          paddingTop: 'calc(16px + env(safe-area-inset-top, 24px))',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, borderBottom: '1px solid var(--border-color)' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
          Queue ({queue.length})
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {queue.length > 0 && (
            <IconButton onClick={clearQueue} size="small" title="Clear Queue" sx={{ color: 'var(--text-muted)' }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton onClick={() => setIsQueueOpen(false)} sx={{ color: 'var(--text-primary)' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {queue.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
          <Typography variant="body1">Queue is empty</Typography>
          <Typography variant="caption" sx={{ mt: 1 }}>Play some songs to add them to your queue!</Typography>
        </Box>
      ) : (
        <List sx={{ width: '100%', mt: 1, overflowY: 'auto' }}>
          {queue.map((track, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <ListItem
                key={`${track.id}-${idx}`}
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeFromQueue(idx)} sx={{ color: 'var(--text-muted)' }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
                sx={{
                  borderRadius: 'var(--radius-sm)',
                  mb: 1,
                  backgroundColor: isCurrent ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(124, 58, 237, 0.3)' : 'none',
                  '&:hover': { backgroundColor: 'var(--bg-glass-card-hover)' },
                  cursor: 'pointer',
                }}
                onClick={() => playTrack(track, queue, idx)}
              >
                <ListItemAvatar sx={{ minWidth: 48, mr: 1 }}>
                  <Avatar
                    src={track.image_url || track.cover_url || track.image || track.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80'}
                    variant="rounded"
                    sx={{ width: 40, height: 40 }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)' }} noWrap>
                      {track.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }} noWrap>
                      {track.artist_name}
                    </Typography>
                  }
                />
                {isCurrent && <AudioVisualizer isPlaying={isPlaying} />}
              </ListItem>
            );
          })}
        </List>
      )}
    </Drawer>
  );
};

export default QueueDrawer;
