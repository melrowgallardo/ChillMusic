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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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

const TrackRow = ({ track, index, queue = [], onAddToPlaylist, onRemoveTrack }) => {
  const { playTrack, currentTrack, isPlaying, togglePlayPause, addToQueue, toggleFavorite: toggleFavContext, isFavorite: isFavContext } = usePlayer();
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [anchorEl, setAnchorEl] = useState(null);

  const isFavRow = isFavContext(track?.id || track?.videoId, track?.title);

  const isCurrentTrack =
    Boolean(currentTrack) &&
    Boolean(track) &&
    (String(currentTrack.id) === String(track.id) ||
      (currentTrack.videoId && track.videoId && String(currentTrack.videoId) === String(track.videoId)) ||
      (currentTrack.id && track.videoId && String(currentTrack.id) === String(track.videoId)) ||
      (currentTrack.videoId && track.id && String(currentTrack.videoId) === String(track.id)) ||
      (currentTrack.title === track.title && (currentTrack.artist === track.artist || currentTrack.artist_name === track.artist_name)));

  const isThisPlaying = isCurrentTrack && isPlaying;

  const handleRowClick = () => {
    if (isThisPlaying || isCurrentTrack) {
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
    toggleFavContext(track);
    if (user && isOnline) {
      try {
        await toggleFavorite(track);
      } catch (err) {
        console.error('Favorite toggle failed:', err);
      }
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
        backgroundColor: isCurrentTrack ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
        borderLeft: isCurrentTrack ? '3px solid var(--accent-primary)' : '3px solid transparent',
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
          {isCurrentTrack ? (
            isThisPlaying ? (
              <AudioVisualizer isPlaying={true} />
            ) : (
              <PauseIcon fontSize="small" sx={{ color: 'var(--accent-primary)' }} />
            )
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
          loading="lazy"
          decoding="async"
          src={
            (track.cover || track.image_url || track.cover_url || track.image || track.artwork || '/default-cover.png')
              .replace('100x100bb', '300x300bb')
              .replace('1000x1000bb', '300x300bb')
          }
          onError={(e) => {
            e.target.src = '/default-cover.png';
          }}
          alt={track.title || 'Music Track'}
          sx={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', objectFit: 'cover', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        />

        <Box sx={{ overflow: 'hidden' }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: isCurrentTrack ? 700 : 500,
              color: isCurrentTrack ? 'var(--accent-primary)' : 'var(--text-primary)',
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
        {typeof track.album === 'object'
          ? (track.album?.name || track.album?.title || 'Single')
          : (track.album || track.album_name || track.album_title || 'Single')}
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

          <MenuItem onClick={handleToggleFavorite}>
            <ListItemIcon>
              {isFavRow ? <FavoriteIcon fontSize="small" sx={{ color: '#ef4444' }} /> : <FavoriteBorderIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{isFavRow ? 'Remove Favorite' : 'Add Favorite'}</ListItemText>
          </MenuItem>

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

          {onRemoveTrack && (
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleMenuClose();
                onRemoveTrack(track);
              }}
            >
              <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText sx={{ color: '#ef4444' }}>Remove</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Box>
  );
};

export default TrackRow;
