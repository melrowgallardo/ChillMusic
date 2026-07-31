import api from './api';
import { searchUnified } from './jamendo';

export const getDeezerAlbum = async (albumId) => {
  try {
    const response = await api.get(`/deezer/album/${albumId}`);
    if (response.data) return response.data;
  } catch (err) {
    console.warn('Backend getDeezerAlbum failed, falling back to public API');
  }
  const fallback = await searchUnified(albumId, 15);
  return {
    id: albumId,
    title: albumId,
    artist: 'Various Artists',
    image_url: fallback.songs?.[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    tracks: fallback.songs || [],
  };
};

export const searchDeezerAlbums = async (query, limit = 20) => {
  try {
    const response = await api.get(`/deezer/search/album?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchDeezerAlbums failed, falling back to public API');
  }
  const fallback = await searchUnified(query, limit);
  return fallback.albums || [];
};

export const searchDeezerTracks = async (query, limit = 20) => {
  try {
    const response = await api.get(`/deezer/search/track?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchDeezerTracks failed, falling back to public API');
  }
  const fallback = await searchUnified(query, limit);
  return fallback.songs || [];
};

export const searchDeezerArtists = async (query, limit = 20) => {
  try {
    const response = await api.get(`/deezer/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchDeezerArtists failed, falling back to public API');
  }
  const fallback = await searchUnified(query, limit);
  return fallback.artists || [];
};

export const getDeezerChart = async (limit = 20) => {
  try {
    const response = await api.get(`/deezer/chart?limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getDeezerChart failed, falling back to public API');
  }
  const fallback = await searchUnified('top chart hits', limit);
  return fallback.songs || [];
};
