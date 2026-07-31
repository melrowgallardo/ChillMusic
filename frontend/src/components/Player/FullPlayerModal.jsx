import React, { useState, useEffect } from 'react';
import { Dialog, Box, Typography, IconButton, Slider, Avatar, Chip, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import ArticleIcon from '@mui/icons-material/Article';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import DownloadIcon from '@mui/icons-material/Download';
import { usePlayer } from '../../context/PlayerContext';
import { getLyrics } from '../../services/lyrics';
import AddToPlaylistModal from '../Playlist/AddToPlaylistModal';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { enqueueOfflineAction, saveDownloadLocally } from '../../services/offlineSync';
import { toggleFavorite as toggleFavFirestore, isFavorite } from '../../services/firestoreService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const formatTime = (secs) => {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const FullPlayerModal = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    isFullPlayerOpen,
    setIsFullPlayerOpen,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    toggleShuffle,
    cycleRepeatMode,
    setIsQueueOpen,
  } = usePlayer();

  const [viewMode, setViewMode] = useState('lyrics'); // 'lyrics' | 'cover'
  const [lyricsData, setLyricsData] = useState(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);

  const { user } = useAuth();
  const { isOnline } = useOffline();

  // Load favorites check could go here if global state existed

  useEffect(() => {
    if (currentTrack && isFullPlayerOpen) {
      fetchTrackLyrics();
    }
  }, [currentTrack, isFullPlayerOpen]);

  useEffect(() => {
    if (user && currentTrack?.id) {
      isFavorite(currentTrack.id).then(setIsFav).catch(() => {});
    }
  }, [user, currentTrack?.id]);

  const handleToggleFavorite = async () => {
    if (!user || !currentTrack) return;

    if (isOnline) {
      try {
        const newStatus = await toggleFavFirestore(currentTrack);
        setIsFav(newStatus);
      } catch (err) {
        console.error('Favorite toggle failed:', err);
      }
    } else {
      const newFav = !isFav;
      setIsFav(newFav);
      await enqueueOfflineAction(newFav ? 'ADD_FAVORITE' : 'REMOVE_FAVORITE', {
        item_type: 'song',
        item_id: currentTrack.id,
        title: currentTrack.title,
        subtitle: currentTrack.artist_name,
        image_url: currentTrack.image_url,
        audio_url: currentTrack.audio_url,
      });
    }
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    try {
      await saveDownloadLocally(currentTrack);

      const sanitizeFileName = (name) => {
        return (name || '').replace(/[\\/:*?"<>|]/g, '').trim();
      };
      
      const filename = `${sanitizeFileName(currentTrack.title)} - ${sanitizeFileName(currentTrack.artist_name)}.mp3`;

      if (Capacitor.isNativePlatform()) {
        try {
          await Filesystem.requestPermissions();
        } catch(e) {
          console.log('Permission request failed or not supported on this platform', e);
        }

        await Filesystem.downloadFile({
          url: currentTrack.audio_url,
          path: filename,
          directory: Directory.Documents,
        });
        alert('Saved to Downloads! Available for offline playback.');
      } else {
        const link = document.createElement('a');
        link.href = currentTrack.audio_url;
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

  const fetchTrackLyrics = async () => {
    if (!currentTrack) return;
    setLoadingLyrics(true);
    try {
      const data = await getLyrics(currentTrack.title, currentTrack.artist_name);
      setLyricsData(data);
    } catch (err) {
      console.error('Error getting lyrics:', err);
    } finally {
      setLoadingLyrics(false);
    }
  };

  if (!currentTrack) return null;

  return (
    <Dialog
      fullScreen
      open={isFullPlayerOpen}
      onClose={() => setIsFullPlayerOpen(false)}
      PaperProps={{
        sx: {
          background: 'linear-gradient(180deg, #18092c 0%, #0b0e17 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header Bar */}
      <Box sx={{ pb: 2.5, pt: 'calc(16px + env(safe-area-inset-top, 24px))', px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            icon={<ArticleIcon fontSize="small" sx={{ color: '#ffffff !important' }} />}
            label="LYRICS"
            clickable
            size="small"
            onClick={() => setViewMode('lyrics')}
            sx={{
              backgroundColor: viewMode === 'lyrics' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
          <Chip
            icon={<LibraryMusicIcon fontSize="small" sx={{ color: '#ffffff !important' }} />}
            label="COVER"
            clickable
            size="small"
            onClick={() => setViewMode('cover')}
            sx={{
              backgroundColor: viewMode === 'cover' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        </Box>
        <IconButton onClick={() => setIsFullPlayerOpen(false)} sx={{ color: '#ffffff' }}>
          <CloseIcon fontSize="large" />
        </IconButton>
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          maxWidth: 550,
          mx: 'auto',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {viewMode === 'cover' ? (
          <Avatar
            src={currentTrack.image_url || currentTrack.cover_url || currentTrack.image || currentTrack.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80'}
            variant="rounded"
            sx={{
              width: { xs: 260, sm: 320 },
              height: { xs: 260, sm: 320 },
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 40px var(--accent-glow)',
              mb: 3,
            }}
          />
        ) : (
          /* Lyrics Container */
          <Box
            sx={{
              width: '100%',
              height: { xs: 280, sm: 320 },
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              p: 3,
              mb: 3,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5)',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'var(--accent-primary)', borderRadius: 3 },
            }}
          >
            {loadingLyrics ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, m: 'auto' }}>
                <CircularProgress size={32} sx={{ color: 'var(--accent-primary)' }} />
                <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                  Loading lyrics...
                </Typography>
              </Box>
            ) : lyricsData && lyricsData.plain_lyrics ? (
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-line',
                  lineHeight: 2,
                  fontWeight: 600,
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  color: '#e2e8f0',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {lyricsData.plain_lyrics}
              </Typography>
            ) : (
              <Box sx={{ m: 'auto' }}>
                <Typography variant="body1" sx={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  ♪ {currentTrack.title} ♪
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mt: 1 }}>
                  By {currentTrack.artist_name}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Song Info Header */}
        <Box sx={{ width: '100%', mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton 
            onClick={() => setPlaylistModalOpen(true)} 
            sx={{ color: '#ffffff' }}
          >
            <PlaylistAddIcon />
          </IconButton>
          
          <Box sx={{ flex: 1, textAlign: 'center', overflow: 'hidden', px: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }} noWrap>
              {currentTrack.title}
            </Typography>
            <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mt: 0.5 }} noWrap>
              {currentTrack.artist_name}
            </Typography>
          </Box>

          <IconButton 
            onClick={handleToggleFavorite} 
            sx={{ color: isFav ? 'var(--accent-pink)' : '#ffffff' }}
          >
            {isFav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        </Box>

        {/* Timeline Slider */}
        <Box sx={{ width: '100%', mb: 2.5 }}>
          <Slider
            size="medium"
            value={currentTime}
            min={0}
            max={duration || 100}
            onChange={(_, val) => seekTo(val)}
            sx={{
              color: 'var(--accent-primary)',
              height: 6,
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
                '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 10px var(--accent-primary)' },
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </Box>
        </Box>

        {/* Playback Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mb: 1 }}>
          <IconButton onClick={toggleShuffle} sx={{ color: isShuffle ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>
            <ShuffleIcon />
          </IconButton>

          <IconButton onClick={prevTrack} sx={{ color: '#ffffff' }}>
            <SkipPreviousIcon fontSize="large" />
          </IconButton>

          <IconButton
            onClick={togglePlayPause}
            sx={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              p: 2,
              '&:hover': { backgroundColor: '#6d28d9', transform: 'scale(1.08)' },
              transition: 'all 0.2s',
            }}
          >
            {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
          </IconButton>

          <IconButton onClick={nextTrack} sx={{ color: '#ffffff' }}>
            <SkipNextIcon fontSize="large" />
          </IconButton>

          <IconButton onClick={cycleRepeatMode} sx={{ color: repeatMode !== 'off' ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>
            {repeatMode === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 1 }}>
          <IconButton onClick={handleDownload} sx={{ color: 'var(--text-secondary)' }}>
            <DownloadIcon />
          </IconButton>
          <IconButton
            onClick={() => {
              setIsFullPlayerOpen(false);
              setIsQueueOpen(true);
            }}
            sx={{ color: 'var(--text-secondary)' }}
          >
            <QueueMusicIcon />
          </IconButton>
        </Box>
      </Box>

      <AddToPlaylistModal 
        open={playlistModalOpen} 
        track={currentTrack} 
        onClose={() => setPlaylistModalOpen(false)} 
      />
    </Dialog>
  );
};

export default FullPlayerModal;
