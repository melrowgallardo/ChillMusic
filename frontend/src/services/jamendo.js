import api from './api';

// Fallback public music search via iTunes API when local backend is unreachable
const fallbackSearchiTunes = async (query, limit = 20) => {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=${limit}&media=music`);
    const data = await res.json();
    const tracks = (data.results || []).map((item) => ({
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

    const artistsMap = new Map();
    const albumsMap = new Map();
    tracks.forEach((t) => {
      if (t.artist && !artistsMap.has(t.artist)) {
        artistsMap.set(t.artist, {
          id: t.artist,
          name: t.artist,
          image: t.cover_url,
          source: 'itunes',
        });
      }
      if (t.album && !albumsMap.has(t.album)) {
        albumsMap.set(t.album, {
          id: t.album,
          title: t.album,
          artist: t.artist,
          cover_url: t.cover_url,
          source: 'itunes',
        });
      }
    });

    return {
      songs: tracks,
      artists: Array.from(artistsMap.values()),
      albums: Array.from(albumsMap.values()),
      playlists: [],
    };
  } catch (e) {
    console.error('Fallback iTunes search failed:', e);
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
  const fallback = await fallbackSearchiTunes('top hits', limit);
  return fallback.songs;
};

export const getNewReleases = async (limit = 20, offset = 0) => {
  try {
    const response = await api.get(`/songs/new-releases?limit=${limit}&offset=${offset}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getNewReleases failed, falling back to public API');
  }
  const fallback = await fallbackSearchiTunes('new releases music', limit);
  return fallback.songs;
};

export const getRecommendations = async (tag = 'chill', limit = 20) => {
  try {
    const response = await api.get(`/songs/recommendations?tag=${tag}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getRecommendations failed, falling back to public API');
  }
  const fallback = await fallbackSearchiTunes(tag, limit);
  return fallback.songs;
};

export const searchSongs = async (query, limit = 20, source = 'all') => {
  try {
    const response = await api.get(`/songs/search?q=${encodeURIComponent(query)}&limit=${limit}&source=${source}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchSongs failed, falling back to public API');
  }
  const fallback = await fallbackSearchiTunes(query, limit);
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
  return await fallbackSearchiTunes(query, limit);
};

export const searchArtists = async (query, limit = 20) => {
  try {
    const response = await api.get(`/artists?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchArtists failed, falling back to public API');
  }
  const fallback = await fallbackSearchiTunes(query, limit);
  return fallback.artists;
};

export const searchAlbums = async (query, limit = 20) => {
  try {
    const response = await api.get(`/albums?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchAlbums failed, falling back to public API');
  }
  const fallback = await fallbackSearchiTunes(query, limit);
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
    const fallback = await fallbackSearchiTunes(artistId, limit);
    return fallback.songs;
  }
};

export const getArtistAlbums = async (artistId, limit = 20) => {
  try {
    const response = await api.get(`/artists/${artistId}/albums?limit=${limit}`);
    return response.data;
  } catch (err) {
    const fallback = await fallbackSearchiTunes(artistId, limit);
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
