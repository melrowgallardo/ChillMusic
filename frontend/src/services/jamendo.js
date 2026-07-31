import api from './api';

export const getTrendingSongs = async (limit = 20, offset = 0) => {
  const response = await api.get(`/songs/trending?limit=${limit}&offset=${offset}`);
  return response.data;
};

export const getNewReleases = async (limit = 20, offset = 0) => {
  const response = await api.get(`/songs/new-releases?limit=${limit}&offset=${offset}`);
  return response.data;
};

export const getRecommendations = async (tag = 'chill', limit = 20) => {
  const response = await api.get(`/songs/recommendations?tag=${tag}&limit=${limit}`);
  return response.data;
};

export const searchSongs = async (query, limit = 20, source = 'all') => {
  const response = await api.get(`/songs/search?q=${encodeURIComponent(query)}&limit=${limit}&source=${source}`);
  return response.data;
};

export const searchUnified = async (query, limit = 20, source = 'all') => {
  const response = await api.get(`/songs/unified-search?q=${encodeURIComponent(query)}&limit=${limit}&source=${source}`);
  return response.data;
};

export const searchArtists = async (query, limit = 20) => {
  const response = await api.get(`/artists?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

export const searchAlbums = async (query, limit = 20) => {
  const response = await api.get(`/albums?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

export const searchPlaylists = async (query, limit = 20) => {
  const response = await api.get(`/playlists?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

export const getArtistDetails = async (artistId) => {
  const response = await api.get(`/artists/${artistId}`);
  return response.data;
};

export const getArtistTracks = async (artistId, limit = 20) => {
  const response = await api.get(`/artists/${artistId}/tracks?limit=${limit}`);
  return response.data;
};

export const getArtistAlbums = async (artistId, limit = 20) => {
  const response = await api.get(`/artists/${artistId}/albums?limit=${limit}`);
  return response.data;
};

export const getAlbumDetails = async (albumId) => {
  const response = await api.get(`/albums/${albumId}`);
  return response.data;
};

export const getPlaylistDetails = async (playlistId) => {
  const response = await api.get(`/playlist/${playlistId}`);
  return response.data;
};
