import api from './api';
import { searchUnified } from './jamendo';

const fetchWithTimeout = async (url, timeoutMs = 3000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

export const fetchYouTubePublic = async (query, limit = 20) => {
  const mirrors = [
    `https://pipedapi.kavin.rocks/streams?q=${encodeURIComponent(query)}&filter=music_songs`,
    `https://api.piped.ovh/streams?q=${encodeURIComponent(query)}&filter=music_songs`,
    `https://pipedapi.kavin.rocks/streams?q=${encodeURIComponent(query)}`,
    `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(query)}`,
  ];

  for (const url of mirrors) {
    try {
      const res = await fetchWithTimeout(url, 3000);
      if (res.ok) {
        const json = await res.json();
        const items = json.items || (Array.isArray(json) ? json : []) || [];
        const tracks = items
          .slice(0, limit)
          .map((item) => {
            let videoId = item.id || '';
            if (!videoId && item.url) {
              videoId = item.url.replace('/watch?v=', '').split('&')[0];
            }
            if (!videoId && item.videoId) {
              videoId = item.videoId;
            }
            if (!videoId) return null;

            let title = item.title || 'Unknown YouTube Track';
            title = title.replace(/\s*\(?(Official\s*(Music)?\s*Video|M\/V|MV|Audio|Lyric\s*Video)\)?/gi, '').trim();

            let artistName = item.uploaderName || item.author || item.uploader || 'YouTube Artist';
            artistName = artistName.replace(/\s*(- Topic|Official|Channel|VEVO)/gi, '').trim();

            const coverUrl =
              item.thumbnail ||
              (item.thumbnails && item.thumbnails.length > 0 ? item.thumbnails[0].url : '') ||
              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            const dur = parseInt(item.duration || 210, 10);
            const audioUrl = `https://invidious.nerdvpn.de/latest_version?id=${videoId}&itag=140`;

            return {
              id: `yt_${videoId}`,
              title,
              artist: artistName,
              artist_name: artistName,
              album: 'YouTube Music',
              album_title: 'YouTube Music',
              duration: dur,
              image_url: coverUrl,
              cover_url: coverUrl,
              image: coverUrl,
              artwork: coverUrl,
              audio_url: audioUrl,
              source: 'youtube',
            };
          })
          .filter(Boolean);

        if (tracks.length > 0) {
          return tracks;
        }
      }
    } catch (err) {
      console.warn('YouTube public search mirror failed:', url, err);
    }
  }
  return [];
};

export const getYouTubeTrending = async (limit = 20) => {
  try {
    const response = await api.get(`/youtube/trending?limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getYouTubeTrending failed, falling back to public YouTube API');
  }
  const yt = await fetchYouTubePublic('trending top hits music', limit);
  if (yt.length > 0) return yt;
  const fallback = await searchUnified('trending top hits', limit);
  return fallback.songs || [];
};

export const searchYouTubeSongs = async (query, limit = 20) => {
  try {
    const response = await api.get(`/youtube/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchYouTubeSongs failed, falling back to public YouTube API');
  }
  const yt = await fetchYouTubePublic(query, limit);
  if (yt.length > 0) return yt;
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
    image_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
};
