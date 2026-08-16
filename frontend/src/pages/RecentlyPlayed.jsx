import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import HistoryIcon from '@mui/icons-material/History';
import { usePlayer } from '../context/PlayerContext';
import TrackList from '../components/Track/TrackList';

const RecentlyPlayed = () => {
  const { recentlyPlayed, playTrack } = usePlayer();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box className="glass-panel" sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
        <HistoryIcon sx={{ fontSize: 60, color: 'var(--accent-secondary)' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--accent-secondary)', fontWeight: 700 }}>
            HISTORY
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, my: 1, fontFamily: 'var(--font-heading)' }}>
            Recently Played
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
            {recentlyPlayed.length} songs played recently
          </Typography>

          {recentlyPlayed.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => playTrack(recentlyPlayed[0], recentlyPlayed, 0)}
                sx={{ backgroundColor: 'var(--accent-primary)', borderRadius: 'var(--radius-full)', px: 3, fontWeight: 700 }}
              >
                Play All
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShuffleIcon />}
                onClick={() => {
                  const rnd = Math.floor(Math.random() * recentlyPlayed.length);
                  playTrack(recentlyPlayed[rnd], recentlyPlayed, rnd);
                }}
                sx={{ borderColor: 'var(--border-color)', color: '#ffffff', borderRadius: 'var(--radius-full)', px: 3 }}
              >
                Shuffle
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {recentlyPlayed.length > 0 ? (
        <TrackList tracks={recentlyPlayed} />
      ) : (
        <Typography sx={{ color: 'var(--text-muted)', textAlign: 'center', my: 4 }}>
          No recently played tracks yet. Start listening to see your history here!
        </Typography>
      )}
    </Box>
  );
};

export default RecentlyPlayed;

