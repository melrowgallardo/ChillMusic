import api from './api';

export const getYouTubeTrending = async (limit = 20) => {
  const response = await api.get(`/youtube/trending?limit=${limit}`);
  return response.data;
};

export const searchYouTubeSongs = async (query, limit = 20) => {
  const response = await api.get(`/youtube/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

export const getYouTubeVideoDetails = async (videoId) => {
  const response = await api.get(`/youtube/video/${videoId}`);
  return response.data;
};
