import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AlbumCard = ({ album }) => {
  const navigate = useNavigate();

  return (
    <Box
      className="glass-card"
      onClick={() => navigate(`/album/${album.id}`)}
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
        src={album.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80'}
        alt={album.name}
        sx={{
          width: '100%',
          aspectRatio: '1/1',
          objectFit: 'cover',
          borderRadius: 'var(--radius-sm)',
        }}
      />
      <Box sx={{ overflow: 'hidden' }}>
        <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }} noWrap>
          {album.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }} noWrap>
          {album.artist_name || 'Album'}
        </Typography>
      </Box>
    </Box>
  );
};

export default AlbumCard;
