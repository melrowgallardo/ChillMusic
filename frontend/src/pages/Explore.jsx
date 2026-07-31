import React, { useState } from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/Common/GlassCard';

const CATEGORIES = [
  { id: 'chill', name: 'Chill & Relax', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)', image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80' },
  { id: 'lofi', name: 'Lofi Beats', gradient: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80' },
  { id: 'ambient', name: 'Ambient & Focus', gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80' },
  { id: 'electronic', name: 'Electronic Synth', gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80' },
  { id: 'jazz', name: 'Smooth Jazz', gradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&q=80' },
  { id: 'rock', name: 'Indie Rock', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80' },
  { id: 'acoustic', name: 'Acoustic Guitar', gradient: 'linear-gradient(135deg, #F97316 0%, #D97706 100%)', image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=80' },
  { id: 'piano', name: 'Peaceful Piano', gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80' },
];

const Explore = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Explore Genres & Moods
        </Typography>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
          Dive into curated vibes for study, relaxation, focus, or workouts.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {CATEGORIES.map((cat) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={cat.id}>
            <GlassCard
              onClick={() => navigate(`/search?q=${cat.id}`)}
              sx={{
                height: 180,
                position: 'relative',
                overflow: 'hidden',
                background: cat.gradient,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-end',
                p: 2.5,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'scale(1.03)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                },
              }}
            >
              <Box
                component="img"
                src={cat.image}
                alt={cat.name}
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: -20,
                  width: 140,
                  height: 140,
                  borderRadius: 'var(--radius-md)',
                  transform: 'rotate(25deg)',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                  objectFit: 'cover',
                  opacity: 0.85,
                }}
              />
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)', zIndex: 1 }}>
                {cat.name}
              </Typography>
            </GlassCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Explore;
