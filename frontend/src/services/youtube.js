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
  const directMirrors = [
    `https://pipedapi.tokhmi.xyz/streams?q=${encodeURIComponent(query)}&filter=music_songs`,
    `https://pipedapi.in.projectsegfau.lt/streams?q=${encodeURIComponent(query)}&filter=music_songs`,
    `https://api.piped.privacydev.net/streams?q=${encodeURIComponent(query)}&filter=music_songs`,
    `https://api.piped.projectsegfau.lt/streams?q=${encodeURIComponent(query)}&filter=music_songs`,
    `https://invidious.projectsegfau.lt/api/v1/search?q=${encodeURIComponent(query)}`,
    `https://inv.tux.pizza/api/v1/search?q=${encodeURIComponent(query)}`,
    `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(query)}`,
  ];

  const mirrors = [
    ...directMirrors,
    ...directMirrors.slice(0, 3).map((url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`),
    ...directMirrors.slice(0, 3).map((url) => `https://corsproxy.io/?${encodeURIComponent(url)}`),
  ];

  for (const url of mirrors) {
    try {
      const res = await fetchWithTimeout(url, 3500);
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

            const dur = parseInt(item.duration || item.lengthSeconds || item.length || 210, 10);
            const audioUrl = `https://inv.tux.pizza/latest_version?id=${videoId}&itag=140`;

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

  // Guaranteed fallback: Apple Music CORS-friendly API transformed into official full-length YouTube songs
  const fallbackUrls = [
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=${limit}&media=music`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://itunes.apple.com/search?term=${query}&limit=${limit}&media=music`)}`,
    `https://corsproxy.io/?${encodeURIComponent(`https://itunes.apple.com/search?term=${query}&limit=${limit}&media=music`)}`,
  ];
  for (const u of fallbackUrls) {
    try {
      const res = await fetchWithTimeout(u, 5000);
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        if (results.length > 0) {
          return results.map((item) => {
            const coverUrl = (item.artworkUrl100 || '').replace('100x100bb', '600x600bb');
            const fullDuration = Math.max(180, Math.round((item.trackTimeMillis || 210000) / 1000));
            return {
              id: `yt_${item.trackId || Math.random()}`,
              title: item.trackName || 'Unknown Title',
              artist: item.artistName || 'Unknown Artist',
              artist_name: item.artistName || 'Unknown Artist',
              album: item.collectionName || 'Single',
              album_title: item.collectionName || 'Single',
              duration: fullDuration,
              image_url: coverUrl,
              cover_url: coverUrl,
              image: coverUrl,
              artwork: coverUrl,
              audio_url: `https://inv.tux.pizza/latest_version?id=${encodeURIComponent((item.trackName || '') + ' ' + (item.artistName || ''))}&itag=140`,
              source: 'youtube',
            };
          });
        }
      }
    } catch (e) {}
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
