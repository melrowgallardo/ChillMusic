import React from 'react';
import { Box, Typography, IconButton, Slider, Avatar, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { usePlayer } from '../../context/PlayerContext';
import AudioVisualizer from './AudioVisualizer';

const formatTime = (secs) => {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const PersistentPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    handleVolumeChange,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    setIsQueueOpen,
    setIsFullPlayerOpen,
  } = usePlayer();

  if (!currentTrack) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(var(--player-height) + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--bg-surface)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-color)',
        zIndex: 1200,
        px: { xs: 1.5, sm: 3 },
        pt: 1,
        pb: 'calc(8px + env(safe-area-inset-bottom))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Track Info */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minWidth: { xs: 160, sm: 220 },
          maxWidth: { xs: 200, sm: 300 },
        }}
      >
        <Avatar
          src={currentTrack.image_url || currentTrack.cover_url || currentTrack.image || currentTrack.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80'}
          variant="rounded"
          onClick={() => setIsFullPlayerOpen(true)}
          sx={{
            width: 52,
            height: 52,
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'scale(1.05)' },
          }}
        />
        <Box sx={{ overflow: 'hidden' }}>
          <Typography
            variant="body1"
            onClick={() => setIsFullPlayerOpen(true)}
            sx={{
              fontWeight: 700,
              cursor: 'pointer',
              color: 'var(--text-primary)',
              '&:hover': { color: 'var(--accent-primary)' },
            }}
            noWrap
          >
            {currentTrack.title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }} noWrap>
            {currentTrack.artist_name}
          </Typography>
        </Box>
        <AudioVisualizer isPlaying={isPlaying} />
      </Box>

      {/* Center Controls & Seek bar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: 1,
          maxWidth: 600,
          px: 2,
        }}
      >
        {/* Playback Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Shuffle">
            <IconButton
              size="small"
              onClick={toggleShuffle}
              sx={{ color: isShuffle ? 'var(--accent-secondary)' : 'var(--text-muted)' }}
            >
              <ShuffleIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <IconButton onClick={prevTrack} sx={{ color: 'var(--text-primary)' }}>
            <SkipPreviousIcon />
          </IconButton>

          <IconButton
            onClick={togglePlayPause}
            sx={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              p: 1,
              '&:hover': { backgroundColor: '#6d28d9', transform: 'scale(1.08)' },
              transition: 'all 0.2s',
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <IconButton onClick={nextTrack} sx={{ color: 'var(--text-primary)' }}>
            <SkipNextIcon />
          </IconButton>

          <Tooltip title={`Repeat (${repeatMode})`}>
            <IconButton
              size="small"
              onClick={cycleRepeatMode}
              sx={{ color: repeatMode !== 'off' ? 'var(--accent-secondary)' : 'var(--text-muted)' }}
            >
              {repeatMode === 'one' ? <RepeatOneIcon fontSize="small" /> : <RepeatIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Seek Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>
            {formatTime(currentTime)}
          </Typography>
          <Slider
            size="small"
            value={currentTime}
            min={0}
            max={duration || 100}
            onChange={(_, val) => seekTo(val)}
            sx={{
              color: 'var(--accent-primary)',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                display: 'none',
              },
              '&:hover .MuiSlider-thumb': {
                display: 'block',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', minWidth: 32 }}>
            {formatTime(duration)}
          </Typography>
        </Box>
      </Box>

      {/* Right Volume & Extra controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: { xs: 100, sm: 180 },
          justifyContent: 'flex-end',
        }}
      >
        <IconButton onClick={toggleMute} size="small" sx={{ color: 'var(--text-muted)' }}>
          {isMuted || volume === 0 ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
        </IconButton>
        <Slider
          size="small"
          value={isMuted ? 0 : volume}
          min={0}
          max={1}
          step={0.01}
          onChange={(_, val) => handleVolumeChange(val)}
          sx={{
            width: 70,
            display: { xs: 'none', sm: 'inline-block' },
            color: 'var(--text-secondary)',
          }}
        />

        <Tooltip title="Queue">
          <IconButton onClick={() => setIsQueueOpen(true)} size="small" sx={{ color: 'var(--text-secondary)' }}>
            <QueueMusicIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Expand Player">
          <IconButton onClick={() => setIsFullPlayerOpen(true)} size="small" sx={{ color: 'var(--text-secondary)' }}>
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default PersistentPlayer;
