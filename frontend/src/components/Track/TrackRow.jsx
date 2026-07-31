import React, { useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import DownloadIcon from '@mui/icons-material/Download';
import QueueIcon from '@mui/icons-material/Queue';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { enqueueOfflineAction, saveDownloadLocally } from '../../services/offlineSync';
import { toggleFavorite, isFavorite } from '../../services/firestoreService';
import AudioVisualizer from '../Player/AudioVisualizer';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const formatDuration = (secs) => {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const TrackRow = ({ track, index, queue = [], onAddToPlaylist }) => {
  const { playTrack, currentTrack, isPlaying, togglePlayPause, addToQueue } = usePlayer();
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [isFav, setIsFav] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  React.useEffect(() => {
    if (user && track?.id) {
      isFavorite(track.id).then(setIsFav).catch(() => {});
    }
  }, [user, track?.id]);

  const isCurrent = currentTrack && currentTrack.id === track.id;

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlayPause();
    } else {
      playTrack(track, queue.length ? queue : [track], index);
    }
  };

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = (e) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  };

  const handleToggleFavorite = async (e) => {
    e.stopPropagation();
    handleMenuClose();
    if (!user) return;

    if (isOnline) {
      try {
        const newStatus = await toggleFavorite(track);
        setIsFav(newStatus);
      } catch (err) {
        console.error('Favorite toggle failed:', err);
      }
    } else {
      const newFav = !isFav;
      setIsFav(newFav);
      await enqueueOfflineAction(newFav ? 'ADD_FAVORITE' : 'REMOVE_FAVORITE', {
        item_type: 'song',
        item_id: track.id,
        title: track.title,
        subtitle: track.artist_name,
        image_url: track.image_url,
        audio_url: track.audio_url,
      });
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    handleMenuClose();

    try {
      await saveDownloadLocally(track);

      const sanitizeFileName = (name) => {
        return (name || '').replace(/[\\/:*?"<>|]/g, '').trim();
      };

      const filename = `${sanitizeFileName(track.title)} - ${sanitizeFileName(track.artist_name)}.mp3`;

      if (Capacitor.isNativePlatform()) {
        try {
          await Filesystem.requestPermissions();
        } catch(e) {
          console.log('Permission request failed or not supported', e);
        }

        await Filesystem.downloadFile({
          url: track.audio_url,
          path: filename,
          directory: Directory.Documents,
        });
        alert('Saved to Downloads! Available for offline playback.');
      } else {
        const link = document.createElement('a');
        link.href = track.audio_url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert('Saved to Downloads! Available for offline playback.');
      }
    } catch (err) {
      console.error('Download registration failed:', err);
      alert('Download failed: ' + (err.message || err));
    }
  };

  return (
    <Box
      onClick={handleRowClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderRadius: 'var(--radius-sm)',
        transition: 'background 0.2s',
        cursor: 'pointer',
        backgroundColor: isCurrent ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
        '&:hover': {
          backgroundColor: 'var(--bg-glass-card-hover)',
          '& .track-idx': { display: 'none' },
          '& .track-play-btn': { display: 'inline-flex' },
        },
      }}
    >
      {/* Left: Index / Cover / Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflow: 'hidden' }}>
        <Box sx={{ minWidth: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
          {isCurrent ? (
            <AudioVisualizer isPlaying={isPlaying} />
          ) : (
            <>
              <Typography variant="body2" className="track-idx" sx={{ fontWeight: 600 }}>
                {index + 1}
              </Typography>
              <IconButton className="track-play-btn" size="small" sx={{ display: 'none', color: '#ffffff' }}>
                <PlayArrowIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>

        <Box
          component="img"
          src={track.image_url || track.cover_url || track.image || track.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80'}
          alt={track.title}
          sx={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
        />

        <Box sx={{ overflow: 'hidden' }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: isCurrent ? 700 : 500,
              color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)',
              fontSize: '0.95rem',
            }}
            noWrap
          >
            {track.title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }} noWrap>
            {track.artist_name}
          </Typography>
        </Box>
      </Box>

      {/* Album name */}
      <Typography
        variant="body2"
        sx={{
          color: 'var(--text-secondary)',
          display: { xs: 'none', md: 'block' },
          flex: 1,
          px: 2,
        }}
        noWrap
      >
        {track.album_name || 'Single'}
      </Typography>

      {/* Right: Duration & Menu */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
          {formatDuration(track.duration)}
        </Typography>

        <IconButton onClick={handleMenuOpen} size="small" sx={{ color: 'var(--text-secondary)' }}>
          <MoreVertIcon fontSize="small" />
        </IconButton>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleMenuClose();
              addToQueue(track);
            }}
          >
            <ListItemIcon><QueueIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Add to Queue</ListItemText>
          </MenuItem>

          {user && (
            <MenuItem onClick={handleToggleFavorite}>
              <ListItemIcon>
                {isFav ? <FavoriteIcon fontSize="small" color="error" /> : <FavoriteBorderIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText>{isFav ? 'Remove Favorite' : 'Add Favorite'}</ListItemText>
            </MenuItem>
          )}

          {user && onAddToPlaylist && (
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleMenuClose();
                onAddToPlaylist(track);
              }}
            >
              <ListItemIcon><PlaylistAddIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Add to Playlist</ListItemText>
            </MenuItem>
          )}

          {user && (
            <MenuItem onClick={handleDownload}>
              <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Download Track</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Box>
  );
};

export default TrackRow;
