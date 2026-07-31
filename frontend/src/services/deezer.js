import api from './api';

export const getDeezerAlbum = async (albumId) => {
  const response = await api.get(`/deezer/album/${albumId}`);
  return response.data;
};

export const searchDeezerAlbums = async (query, limit = 20) => {
  const response = await api.get(`/deezer/search/album?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

export const searchDeezerTracks = async (query, limit = 20) => {
  const response = await api.get(`/deezer/search/track?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

export const searchDeezerArtists = async (query, limit = 20) => {
  const response = await api.get(`/deezer/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

export const getDeezerChart = async (limit = 20) => {
  const response = await api.get(`/deezer/chart?limit=${limit}`);
  return response.data;
};
