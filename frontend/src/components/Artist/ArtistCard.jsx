import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ArtistCard = ({ artist }) => {
  const navigate = useNavigate();

  const name = artist?.name || 'Unknown Artist';
  const cover = artist?.imageUrl || artist?.image_url || artist?.cover_url || artist?.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80';
  const genres = artist?.genres ? (Array.isArray(artist.genres) ? artist.genres.join(', ') : artist.genres) : null;
  const followers = artist?.followers ? (typeof artist.followers === 'number' ? `${(artist.followers / 1000000).toFixed(1)}M Fans` : artist.followers) : null;

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
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(124, 58, 237, 0.25)',
        },
      }}
    >
      <Avatar
        src={cover}
        alt={name}
        sx={{
          width: 120,
          height: 120,
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
        }}
      />
      <Box sx={{ width: '100%', overflow: 'hidden' }}>
        <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }} noWrap>
          {name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mt: 0.5 }} noWrap>
          {followers || genres || 'Artist'}
        </Typography>
      </Box>
    </Box>
  );
};

export default ArtistCard;
