import api from './api';
import { searchUnified } from './jamendo';

export const getYouTubeTrending = async (limit = 20) => {
  try {
    const response = await api.get(`/youtube/trending?limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getYouTubeTrending failed, falling back to public API');
  }
  const fallback = await searchUnified('trending top hits', limit);
  return fallback.songs || [];
};

export const searchYouTubeSongs = async (query, limit = 20) => {
  try {
    const response = await api.get(`/youtube/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchYouTubeSongs failed, falling back to public API');
  }
  const fallback = await searchUnified(query, limit);
  return fallback.songs || [];
};

export const getYouTubeVideoDetails = async (videoId) => {
  try {
    const response = await api.get(`/youtube/video/${videoId}`);
    if (response.data) return response.data;
  } catch (err) {
    console.warn('Backend getYouTubeVideoDetails failed, falling back to public API');
  }
  const fallback = await searchUnified(videoId, 1);
  return fallback.songs?.[0] || {
    id: videoId,
    title: 'Music Track',
    artist: 'Various Artists',
    image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
  };
};
