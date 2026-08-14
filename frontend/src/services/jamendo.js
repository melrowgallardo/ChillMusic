import api from './api';
import { FALLBACK_TRACKS, FALLBACK_PLAYLISTS, FALLBACK_ARTISTS } from './mockData';

// Helper to prevent browser fetch calls from hanging indefinitely
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

import { isPreviewUrl } from './audioResolver';

// Resilient, fast public music search fallback (YouTube full songs + Audius + JioSaavn + Jamendo)
const fallbackUnifiedSearch = async (query, limit = 20) => {
  if (!query || !query.trim()) {
    return { songs: FALLBACK_TRACKS, artists: FALLBACK_ARTISTS, albums: [], playlists: FALLBACK_PLAYLISTS };
  }

  const q = query.trim();

  // Fast fetcher helper with strict 2.5s timeout
  const fastFetchJson = async (url, timeoutMs = 2500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) return await res.json();
    } catch (e) {
    } finally {
      clearTimeout(timer);
    }
    return null;
  };

  // 1. Audius API search (Direct open music API, CORS enabled, ~300ms)
  const fetchAudius = async () => {
    try {
      const json = await fastFetchJson(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&limit=${limit}`, 2500);
      if (json && Array.isArray(json.data)) {
        return json.data
          .filter((i) => i && i.duration >= 60)
          .map((item) => {
            const coverUrl = item.artwork?.['480x480'] || item.artwork?.['1000x1000'] || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
            return {
              id: `au_${item.id}`,
              title: item.title || 'Unknown Title',
              artist: item.user?.name || 'Unknown Artist',
              artist_name: item.user?.name || 'Unknown Artist',
              album: 'Audius Music',
              album_title: 'Audius Music',
              duration: item.duration || 210,
              image_url: coverUrl,
              cover_url: coverUrl,
              image: coverUrl,
              artwork: coverUrl,
              audio_url: `https://api.audius.co/v1/tracks/${item.id}/stream`,
              source: 'audius',
            };
          });
      }
    } catch (e) {}
    return [];
  };

  // 2. Fast JioSaavn API search (~400ms)
  const fetchSaavnFast = async () => {
    const saavnEndpoints = [
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(q)}&limit=${limit}`,
      `https://jiosaavn-api-v2.vercel.app/search/songs?query=${encodeURIComponent(q)}`,
      `https://saavn.me/search/songs?query=${encodeURIComponent(q)}&limit=${limit}`,
    ];
    for (const url of saavnEndpoints) {
      try {
        const json = await fastFetchJson(url, 2000);
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
              if (!coverUrl) coverUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

              let audioUrl = '';
              const audioList = item.downloadUrl || item.url || [];
              if (Array.isArray(audioList) && audioList.length > 0) {
                const lastAudio = audioList[audioList.length - 1];
                audioUrl = typeof lastAudio === 'object' ? (lastAudio.url || lastAudio.link || '') : typeof lastAudio === 'string' ? lastAudio : '';
              } else if (typeof audioList === 'string') {
                audioUrl = audioList;
              }

              let artistName = item.primaryArtists || item.artist || (item.artists?.primary ? item.artists.primary.map((a) => a.name).join(', ') : 'Unknown Artist');
              let albumTitle = typeof item.album === 'object' ? (item.album.name || item.album.title || 'Single') : (item.album || 'Single');

              return {
                id: `saavn_${item.id || Math.random()}`,
                title: item.name || item.title || 'Unknown Title',
                artist: artistName,
                artist_name: artistName,
                album: albumTitle,
                album_title: albumTitle,
                duration: parseInt(item.duration || 210, 10),
                image_url: coverUrl,
                cover_url: coverUrl,
                image: coverUrl,
                artwork: coverUrl,
                audio_url: audioUrl,
                source: 'saavn',
              };
            })
            .filter((t) => t && t.audio_url && t.duration >= 60 && !isPreviewUrl(t.audio_url, t.duration));
          if (tracks.length > 0) return tracks;
        }
      } catch (e) {}
    }
    return [];
  };

  // 3. Fast YouTube Invidious search (~600ms)
  const fetchYouTubeFast = async () => {
    return await fetchYouTubePublic(q, limit);
  };

  // 4. Fast Jamendo open search (~400ms)
  const fetchJamendoFast = async () => {
    try {
      const json = await fastFetchJson(`https://api.jamendo.com/v2.0/tracks/?client_id=56d30c08&format=json&search=${encodeURIComponent(q)}&limit=${limit}`, 2000);
      if (json && Array.isArray(json.results)) {
        return json.results.map((item) => ({
          id: `jm_${item.id}`,
          title: item.name || 'Unknown Track',
          artist: item.artist_name || 'Jamendo Artist',
          artist_name: item.artist_name || 'Jamendo Artist',
          album: item.album_name || 'Jamendo Album',
          album_title: item.album_name || 'Jamendo Album',
          duration: item.duration || 180,
          image_url: item.album_image || item.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
          cover_url: item.album_image || item.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
          audio_url: item.audio || item.audiodownload,
          source: 'jamendo',
        })).filter((t) => t.audio_url && t.duration >= 60);
      }
    } catch (e) {}
    return [];
  };

  // 5. Deezer Artists & Albums
  const fetchDeezerMetadata = async () => {
    try {
      const res = await fastFetchJson(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`)}`, 2500);
      if (res && res.contents) {
        const json = typeof res.contents === 'string' ? JSON.parse(res.contents) : res.contents;
        const items = json.data || [];
        const artists = [];
        const albums = [];
        const seenArt = new Set();
        const seenAlb = new Set();

        for (const item of items) {
          if (item.artist && !seenArt.has(item.artist.id)) {
            seenArt.add(item.artist.id);
            artists.push({
              id: `dz_art_${item.artist.id}`,
              name: item.artist.name,
              image_url: item.artist.picture_medium || item.artist.picture || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
              cover_url: item.artist.picture_medium || item.artist.picture || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
              source: 'deezer',
            });
          }
          if (item.album && !seenAlb.has(item.album.id)) {
            seenAlb.add(item.album.id);
            albums.push({
              id: `dz_${item.album.id}`,
              title: item.album.title,
              artist: item.artist?.name || 'Unknown Artist',
              image_url: item.album.cover_medium || item.album.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
              cover_url: item.album.cover_medium || item.album.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
              source: 'deezer',
            });
          }
        }
        return { artists, albums };
      }
    } catch (e) {}
    return { artists: [], albums: [] };
  };

  try {
    const [ytRes, saavnRes, audiusRes, jamendoRes, deezerRes] = await Promise.allSettled([
      fetchYouTubeFast(),
      fetchSaavnFast(),
      fetchAudius(),
      fetchJamendoFast(),
      fetchDeezerMetadata(),
    ]);

    const ytTracks = ytRes.status === 'fulfilled' ? ytRes.value : [];
    const saavnTracks = saavnRes.status === 'fulfilled' ? saavnRes.value : [];
    const audiusTracks = audiusRes.status === 'fulfilled' ? audiusRes.value : [];
    const jamendoTracks = jamendoRes.status === 'fulfilled' ? jamendoRes.value : [];
    const deezerMeta = deezerRes.status === 'fulfilled' ? deezerRes.value : { artists: [], albums: [] };

    const combinedSongs = [...saavnTracks, ...ytTracks, ...audiusTracks, ...jamendoTracks].filter(
      (t) => t && t.audio_url && t.duration >= 60 && !isPreviewUrl(t.audio_url, t.duration)
    );

    const songs = combinedSongs.length > 0 ? combinedSongs : FALLBACK_TRACKS;
    const artists = deezerMeta.artists.length > 0 ? deezerMeta.artists : FALLBACK_ARTISTS;
    const albums = deezerMeta.albums;
    const playlists = FALLBACK_PLAYLISTS;

    return { songs, artists, albums, playlists };
  } catch (e) {
    return { songs: FALLBACK_TRACKS, artists: FALLBACK_ARTISTS, albums: [], playlists: FALLBACK_PLAYLISTS };
  }
};

export const getTrendingSongs = async (limit = 20, offset = 0) => {
  try {
    const response = await api.get(`/songs/trending?limit=${limit}&offset=${offset}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getTrendingSongs failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch('top hits', limit);
  if (fallback.songs && fallback.songs.length > 0) return fallback.songs;
  return FALLBACK_TRACKS.slice(0, limit);
};

export const getNewReleases = async (limit = 20, offset = 0) => {
  try {
    const response = await api.get(`/songs/new-releases?limit=${limit}&offset=${offset}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getNewReleases failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch('new releases music', limit);
  if (fallback.songs && fallback.songs.length > 0) return fallback.songs;
  return FALLBACK_TRACKS.slice().reverse().slice(0, limit);
};

export const getRecommendations = async (tag = 'chill', limit = 20) => {
  try {
    const response = await api.get(`/songs/recommendations?tag=${tag}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getRecommendations failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(tag, limit);
  if (fallback.songs && fallback.songs.length > 0) return fallback.songs;
  return FALLBACK_TRACKS.slice(0, limit);
};

export const searchSongs = async (query, limit = 20, source = 'all') => {
  try {
    const response = await api.get(`/songs/search?q=${encodeURIComponent(query)}&limit=${limit}&source=${source}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchSongs failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, limit);
  if (fallback.songs && fallback.songs.length > 0) return fallback.songs;
  return FALLBACK_TRACKS.slice(0, limit);
};

export const searchUnified = async (query, limit = 20, source = 'all') => {
  try {
    const response = await api.get(`/songs/unified-search?q=${encodeURIComponent(query)}&limit=${limit}&source=${source}`);
    if (response.data && (response.data.songs?.length > 0 || response.data.artists?.length > 0 || response.data.albums?.length > 0)) {
      return response.data;
    }
  } catch (err) {
    console.warn('Backend searchUnified failed, falling back to public API');
  }
  const res = await fallbackUnifiedSearch(query, limit);
  if (res.songs && res.songs.length > 0) return res;
  return { songs: FALLBACK_TRACKS, artists: FALLBACK_ARTISTS, albums: [], playlists: FALLBACK_PLAYLISTS };
};

export const searchArtists = async (query, limit = 20) => {
  try {
    const response = await api.get(`/artists?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchArtists failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, limit);
  if (fallback.artists && fallback.artists.length > 0) return fallback.artists;
  return FALLBACK_ARTISTS;
};

export const searchAlbums = async (query, limit = 20) => {
  try {
    const response = await api.get(`/albums?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchAlbums failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, limit);
  return fallback.albums || [];
};

export const searchPlaylists = async (query, limit = 20) => {
  try {
    const response = await api.get(`/playlists?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchPlaylists failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, 10);
  if (fallback.playlists && fallback.playlists.length > 0) return fallback.playlists;
  return FALLBACK_PLAYLISTS;
};

export const getArtistDetails = async (artistId) => {
  try {
    const response = await api.get(`/artists/${artistId}`);
    if (response.data) return response.data;
  } catch (err) {
    console.warn('Backend getArtistDetails failed, using fallback');
  }
  const fallback = await fallbackUnifiedSearch(artistId, 15);
  const artistObj = fallback.artists[0] || {
    id: artistId,
    name: artistId,
    image_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    cover_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    image: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
  };
  return {
    ...artistObj,
    bio: `Listen to top tracks and albums by ${artistObj.name}.`,
    followers: 125000,
    monthly_listeners: 450000,
  };
};

export const getArtistTracks = async (artistId, limit = 20) => {
  try {
    const response = await api.get(`/artists/${artistId}/tracks?limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getArtistTracks failed, using fallback');
  }
  const fallback = await fallbackUnifiedSearch(artistId, limit);
  return fallback.songs;
};

export const getArtistAlbums = async (artistId, limit = 20) => {
  try {
    const response = await api.get(`/artists/${artistId}/albums?limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getArtistAlbums failed, using fallback');
  }
  const fallback = await fallbackUnifiedSearch(artistId, limit);
  return fallback.albums;
};

export const getAlbumDetails = async (albumId) => {
  try {
    const response = await api.get(`/albums/${albumId}`);
    if (response.data) return response.data;
  } catch (err) {
    console.warn('Backend getAlbumDetails failed, using fallback');
  }
  const fallback = await fallbackUnifiedSearch(albumId, 20);
  const albumObj = fallback.albums[0] || {
    id: albumId,
    title: albumId,
    artist: 'Various Artists',
    image_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    cover_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
  };
  return {
    ...albumObj,
    tracks: fallback.songs,
    release_date: '2024',
    total_tracks: fallback.songs.length,
  };
};

export const getPlaylistDetails = async (playlistId) => {
  try {
    const response = await api.get(`/playlist/${playlistId}`);
    if (response.data) return response.data;
  } catch (err) {
    console.warn('Backend getPlaylistDetails failed, using fallback');
  }
  const fallback = await fallbackUnifiedSearch(playlistId || 'chill vibes', 25);
  return {
    id: playlistId || 'default-playlist',
    name: 'Chill Vibes Playlist',
    description: 'A curated mix of full-length chill music and top hits.',
    image_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    cover_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    tracks: fallback.songs,
  };
};
