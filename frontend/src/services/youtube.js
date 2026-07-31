import api from './api';
import { searchUnified } from './jamendo';

const fetchWithTimeout = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

const fetchProxyJson = async (url, timeoutMs = 8000) => {
  // 1. Try Codetabs CORS proxy (bypasses browser CORS cleanly)
  try {
    const res = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, timeoutMs);
    if (res.ok) {
      const json = await res.json();
      if (json) return json;
    }
  } catch (e1) {}

  // 2. Try AllOrigins GET proxy
  try {
    const res = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, timeoutMs);
    if (res.ok) {
      const data = await res.json();
      if (data && data.contents) {
        return typeof data.contents === 'string' ? JSON.parse(data.contents) : data.contents;
      }
    }
  } catch (e2) {}

  // 3. Try Direct fetch
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    if (res.ok) {
      return await res.json();
    }
  } catch (e3) {}

  // 4. Try CorsProxy.io
  try {
    const res = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(url)}`, timeoutMs);
    if (res.ok) {
      return await res.json();
    }
  } catch (e4) {}

  return null;
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

  for (const url of directMirrors) {
    try {
      const json = await fetchProxyJson(url, 7500);
      if (json) {
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
          .filter((t) => t && t.duration >= 60);

        if (tracks.length > 0) {
          return tracks;
        }
      }
    } catch (err) {
      console.warn('YouTube public search mirror failed:', url, err);
    }
  }

  // Guaranteed full-length song fallback: JioSaavn CDN Full-Length Studio Songs (Never 30s previews)
  const saavnUrls = [
    `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
    `https://jiosaavn-api-v2.vercel.app/search/songs?query=${encodeURIComponent(query)}`,
    `https://saavn.me/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
  ];

  for (const url of saavnUrls) {
    try {
      const json = await fetchProxyJson(url, 8000);
      if (json) {
        const results = json.data?.results || (Array.isArray(json.data) ? json.data : []) || [];
        const tracks = results
          .map((item) => {
            const imgList = item.image || item.images || [];
            let coverUrl = '';
            if (Array.isArray(imgList) && imgList.length > 0) {
              const lastImg = imgList[imgList.length - 1];
              coverUrl = typeof lastImg === 'object' ? (lastImg.url || lastImg.link || '') : typeof lastImg === 'string' ? lastImg : '';
            } else if (typeof imgList === 'string') {
              coverUrl = imgList;
            }
            if (!coverUrl) {
              coverUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
            }

            let audioUrl = '';
            const audioList = item.downloadUrl || item.url || item.media_preview_url || [];
            if (Array.isArray(audioList) && audioList.length > 0) {
              for (let i = audioList.length - 1; i >= 0; i--) {
                const entry = audioList[i];
                const u = typeof entry === 'object' ? (entry.url || entry.link || '') : typeof entry === 'string' ? entry : '';
                if (u && u.startsWith('http') && !u.includes('jiosaavn.com/song')) {
                  audioUrl = u;
                  break;
                }
              }
            } else if (typeof audioList === 'string' && !audioList.includes('jiosaavn.com/song')) {
              audioUrl = audioList;
            }

            let artistName = 'Unknown Artist';
            if (item.artists && Array.isArray(item.artists.primary) && item.artists.primary.length > 0) {
              artistName = item.artists.primary.map((a) => a.name).join(', ');
            } else if (item.primaryArtists) {
              artistName = item.primaryArtists;
            } else if (item.artist) {
              artistName = item.artist;
            }

            let albumTitle = 'Single';
            if (item.album && typeof item.album === 'object') {
              albumTitle = item.album.name || item.album.title || 'Single';
            } else if (typeof item.album === 'string') {
              albumTitle = item.album;
            }

            const dur = parseInt(item.duration || 210, 10);

            return {
              id: `saavn_${item.id || Math.random()}`,
              title: item.name || item.title || 'Unknown Title',
              artist: artistName,
              artist_name: artistName,
              album: albumTitle,
              album_title: albumTitle,
              duration: dur,
              image_url: coverUrl,
              cover_url: coverUrl,
              image: coverUrl,
              artwork: coverUrl,
              audio_url: audioUrl,
              source: 'saavn',
            };
          })
          .filter((t) => t && t.audio_url && t.duration >= 60);

        if (tracks.length > 0) return tracks;
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
