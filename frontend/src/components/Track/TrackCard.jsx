import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DownloadIcon from '@mui/icons-material/Download';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { enqueueOfflineAction, saveDownloadLocally } from '../../services/offlineSync';
import { toggleFavorite as toggleFavFirestore, isFavorite } from '../../services/firestoreService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const TrackCard = ({ track, queue = [] }) => {
  const { playTrack, currentTrack, isPlaying, toggleFavorite: toggleFavContext, isFavorite: isFavContext } = usePlayer();
  const { user } = useAuth();
  const { isOnline } = useOffline();

  const isFavCard = isFavContext(track?.id, track?.title);
  const isCurrent = currentTrack && (String(currentTrack.id) === String(track.id) || currentTrack.title === track.title);

  const handlePlay = (e) => {
    e.stopPropagation();
    playTrack(track, queue.length ? queue : [track]);
  };

  const handleToggleFav = async (e) => {
    e.stopPropagation();
    toggleFavContext(track);
    if (user && isOnline) {
      try {
        await toggleFavFirestore(track);
      } catch (err) {
        console.error('Failed favorite toggle online:', err);
      }
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      await saveDownloadLocally(track);

      const sanitizeFileName = (name) => {
        return (name || '').replace(/[\\/:*?"<>|]/g, '').trim();
      };

      const filename = `${sanitizeFileName(track.title)} - ${sanitizeFileName(track.artist_name)}.mp3`;

      if (Capacitor.isNativePlatform()) {
        try {
          await Filesystem.requestPermissions();
        } catch(e) {}
        await Filesystem.downloadFile({
          url: track.audio_url,
          path: filename,
          directory: Directory.Documents,
        });
      } else {
        const link = document.createElement('a');
        link.href = track.audio_url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      alert('Saved to Downloads! Available for offline playback.');
    } catch (err) {
      alert('Download failed: ' + (err.message || err));
    }
  };

  return (
    <Box
      className="glass-card"
      onClick={handlePlay}
      sx={{
        padding: '12px',
        position: 'relative',
        group: 'true',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        '&:hover .play-btn': {
          opacity: 1,
          transform: 'translateY(0)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingTop: '100%',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
        }}
      >
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
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />

        {/* Play Overlay */}
        <IconButton
          className="play-btn"
          onClick={handlePlay}
          sx={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            opacity: isCurrent ? 1 : 0,
            transform: isCurrent ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
            '&:hover': {
              backgroundColor: '#6d28d9',
              transform: 'scale(1.1)',
            },
          }}
        >
          <PlayArrowIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ overflow: 'hidden', flex: 1, mr: 1 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
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

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Download for Offline">
            <IconButton size="small" onClick={handleDownload} sx={{ color: 'var(--text-muted)', '&:hover': { color: 'var(--accent-primary)' } }}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFavCard ? 'Remove Favorite' : 'Add Favorite'}>
            <IconButton size="small" onClick={handleToggleFav} sx={{ color: isFavCard ? 'var(--accent-pink)' : 'var(--text-muted)' }}>
              {isFavCard ? <FavoriteIcon fontSize="small" sx={{ color: '#ef4444' }} /> : <FavoriteBorderIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default TrackCard;
