import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AlbumCard = ({ album }) => {
  const navigate = useNavigate();

  const title = album?.title || album?.name || 'Unknown Album';
  const artist = album?.artist || album?.artist_name || 'Various Artists';
  const cover = album?.coverUrl || album?.image || album?.cover_url || album?.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80';
  const rawDate = String(album?.releaseDate || album?.release_date || '');
  const year = rawDate ? rawDate.substring(0, 4) : '';

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
        src={cover}
        alt={title}
        sx={{
          width: '100%',
          aspectRatio: '1/1',
          objectFit: 'cover',
          borderRadius: 'var(--radius-sm)',
        }}
      />
      <Box sx={{ overflow: 'hidden' }}>
        <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }} noWrap>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }} noWrap>
          {artist} {year ? `• ${year}` : ''}
        </Typography>
      </Box>
    </Box>
  );
};

export default AlbumCard;
