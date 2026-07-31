import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const PlaylistCard = ({ playlist }) => {
  const navigate = useNavigate();

  const cover = playlist.cover_url || playlist.zip || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80';
  const name = playlist.title || playlist.name;
  const owner = playlist.user_name || 'ChillMusic User';

  return (
    <Box
      className="glass-card"
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      sx={{
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        cursor: 'pointer',
      }}
    >
      <Box
        component="img"
        src={cover}
        alt={name}
        sx={{
          width: '100%',
          aspectRatio: '1/1',
          objectFit: 'cover',
          borderRadius: 'var(--radius-sm)',
        }}
      />
      <Box sx={{ overflow: 'hidden' }}>
        <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }} noWrap>
          {name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }} noWrap>
          By {owner}
        </Typography>
      </Box>
    </Box>
  );
};

export default PlaylistCard;
