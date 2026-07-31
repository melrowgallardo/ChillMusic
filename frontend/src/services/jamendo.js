import api from './api';

// Resilient public music search fallback (iTunes + Jamendo with CORS proxy support for Vercel production)
const fallbackUnifiedSearch = async (query, limit = 20) => {
  const fetchiTunes = async () => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=${limit}&media=music`;
    const parseResults = (results) =>
      (results || []).map((item) => ({
        id: String(item.trackId || Math.random()),
        title: item.trackName || 'Unknown Title',
        artist: item.artistName || 'Unknown Artist',
        artist_name: item.artistName || 'Unknown Artist',
        album: item.collectionName || 'Single',
        album_title: item.collectionName || 'Single',
        duration: Math.round((item.trackTimeMillis || 180000) / 1000),
        cover_url: (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        audio_url: item.previewUrl || '',
        source: 'itunes',
      }));

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return parseResults(data.results);
      }
    } catch (err) {
      console.warn('Direct iTunes fetch CORS blocked, attempting CORS proxy...');
    }

    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const data = await res.json();
        return parseResults(data.results);
      }
    } catch (proxyErr) {
      console.error('iTunes CORS proxy fallback failed:', proxyErr);
    }
    return [];
  };

  const fetchJamendo = async () => {
    const clientId = import.meta.env.VITE_JAMENDO_CLIENT_ID || 'aee77fe5';
    try {
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=jsonpretty&limit=${limit}&search=${encodeURIComponent(query)}&include=musicinfo`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return (data.results || []).map((item) => ({
          id: String(item.id),
          title: item.name || 'Unknown Title',
          artist: item.artist_name || 'Unknown Artist',
          artist_name: item.artist_name || 'Unknown Artist',
          album: item.album_name || 'Single',
          album_title: item.album_name || 'Single',
          duration: parseInt(item.duration || 180, 10),
          cover_url: item.image || '',
          audio_url: item.audio || '',
          source: 'jamendo',
        }));
      }
    } catch (err) {
      console.warn('Jamendo direct fetch failed:', err);
    }
    return [];
  };

  try {
    const [itunesTracks, jamendoTracks] = await Promise.all([
      fetchiTunes(),
      fetchJamendo(),
    ]);

    const combined = [...itunesTracks, ...jamendoTracks];
    const uniqueSongs = [];
    const seenIds = new Set();
    for (const song of combined) {
      if (!seenIds.has(song.id)) {
        seenIds.add(song.id);
        uniqueSongs.push(song);
      }
    }

    const artistsMap = new Map();
    const albumsMap = new Map();
    uniqueSongs.forEach((t) => {
      if (t.artist && !artistsMap.has(t.artist)) {
        artistsMap.set(t.artist, {
          id: t.artist,
          name: t.artist,
          image: t.cover_url,
          source: t.source,
        });
      }
      if (t.album && !albumsMap.has(t.album)) {
        albumsMap.set(t.album, {
          id: t.album,
          title: t.album,
          artist: t.artist,
          cover_url: t.cover_url,
          source: t.source,
        });
      }
    });

    return {
      songs: uniqueSongs,
      artists: Array.from(artistsMap.values()),
      albums: Array.from(albumsMap.values()),
      playlists: [],
    };
  } catch (e) {
    console.error('Fallback unified search failed:', e);
    return { songs: [], artists: [], albums: [], playlists: [] };
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
  return fallback.songs;
};

export const getNewReleases = async (limit = 20, offset = 0) => {
  try {
    const response = await api.get(`/songs/new-releases?limit=${limit}&offset=${offset}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getNewReleases failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch('new releases music', limit);
  return fallback.songs;
};

export const getRecommendations = async (tag = 'chill', limit = 20) => {
  try {
    const response = await api.get(`/songs/recommendations?tag=${tag}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getRecommendations failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(tag, limit);
  return fallback.songs;
};

export const searchSongs = async (query, limit = 20, source = 'all') => {
  try {
    const response = await api.get(`/songs/search?q=${encodeURIComponent(query)}&limit=${limit}&source=${source}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchSongs failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, limit);
  return fallback.songs;
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
  return await fallbackUnifiedSearch(query, limit);
};

export const searchArtists = async (query, limit = 20) => {
  try {
    const response = await api.get(`/artists?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchArtists failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, limit);
  return fallback.artists;
};

export const searchAlbums = async (query, limit = 20) => {
  try {
    const response = await api.get(`/albums?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchAlbums failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, limit);
  return fallback.albums;
};

export const searchPlaylists = async (query, limit = 20) => {
  try {
    const response = await api.get(`/playlists?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  } catch (err) {
    return [];
  }
};

export const getArtistDetails = async (artistId) => {
  const response = await api.get(`/artists/${artistId}`);
  return response.data;
};

export const getArtistTracks = async (artistId, limit = 20) => {
  try {
    const response = await api.get(`/artists/${artistId}/tracks?limit=${limit}`);
    return response.data;
  } catch (err) {
    const fallback = await fallbackUnifiedSearch(artistId, limit);
    return fallback.songs;
  }
};

export const getArtistAlbums = async (artistId, limit = 20) => {
  try {
    const response = await api.get(`/artists/${artistId}/albums?limit=${limit}`);
    return response.data;
  } catch (err) {
    const fallback = await fallbackUnifiedSearch(artistId, limit);
    return fallback.albums;
  }
};

export const getAlbumDetails = async (albumId) => {
  const response = await api.get(`/albums/${albumId}`);
  return response.data;
};

export const getPlaylistDetails = async (playlistId) => {
  const response = await api.get(`/playlist/${playlistId}`);
  return response.data;
};
