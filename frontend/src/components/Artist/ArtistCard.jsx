import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ArtistCard = ({ artist }) => {
  const navigate = useNavigate();

  return (
    <Box
      className="glass-card"
      onClick={() => navigate(`/artist/${artist.id}`)}
      sx={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        cursor: 'pointer',
        gap: 2,
      }}
    >
      <Avatar
        src={artist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80'}
        alt={artist.name}
        sx={{
          width: 120,
          height: 120,
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
        }}
      />
      <Box sx={{ width: '100%' }}>
        <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }} noWrap>
          {artist.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
          Artist
        </Typography>
      </Box>
    </Box>
  );
};

export default ArtistCard;
