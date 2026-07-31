import api from './api';

// Helper to prevent browser fetch calls from hanging indefinitely
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

// Resilient public music search fallback (Jamendo + Audius full songs + iTunes with CORS proxy support)
const fallbackUnifiedSearch = async (query, limit = 20) => {
  const fetchiTunes = async () => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=${limit}&media=music`;
    const parseResults = (results) =>
      (results || []).map((item) => {
        const coverUrl = (item.artworkUrl100 || '').replace('100x100bb', '600x600bb');
        return {
          id: String(item.trackId || Math.random()),
          title: item.trackName || 'Unknown Title',
          artist: item.artistName || 'Unknown Artist',
          artist_name: item.artistName || 'Unknown Artist',
          album: item.collectionName || 'Single',
          album_title: item.collectionName || 'Single',
          duration: Math.round((item.trackTimeMillis || 180000) / 1000),
          image_url: coverUrl,
          cover_url: coverUrl,
          image: coverUrl,
          artwork: coverUrl,
          audio_url: item.previewUrl || '',
          source: 'itunes',
        };
      });

    try {
      const res = await fetchWithTimeout(url, 3000);
      if (res.ok) {
        const data = await res.json();
        return parseResults(data.results);
      }
    } catch (err) {
      console.warn('Direct iTunes fetch failed or blocked, trying CORS proxy...');
    }

    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetchWithTimeout(proxyUrl, 3000);
      if (res.ok) {
        const data = await res.json();
        return parseResults(data.results);
      }
    } catch (proxyErr) {
      console.warn('iTunes CORS proxy fallback failed:', proxyErr);
    }
    return [];
  };

  const fetchJamendo = async () => {
    const clientId = import.meta.env.VITE_JAMENDO_CLIENT_ID || 'aee77fe5';
    try {
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=jsonpretty&limit=${limit}&search=${encodeURIComponent(query)}&include=musicinfo`;
      const res = await fetchWithTimeout(url, 3000);
      if (res.ok) {
        const data = await res.json();
        return (data.results || []).map((item) => {
          const coverUrl = item.image || '';
          return {
            id: String(item.id),
            title: item.name || 'Unknown Title',
            artist: item.artist_name || 'Unknown Artist',
            artist_name: item.artist_name || 'Unknown Artist',
            album: item.album_name || 'Single',
            album_title: item.album_name || 'Single',
            duration: parseInt(item.duration || 180, 10),
            image_url: coverUrl,
            cover_url: coverUrl,
            image: coverUrl,
            artwork: coverUrl,
            audio_url: item.audio || '',
            source: 'jamendo',
          };
        });
      }
    } catch (err) {
      console.warn('Jamendo fetch failed or timed out:', err);
    }
    return [];
  };

  const fetchAudius = async () => {
    try {
      const url = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}&app_name=chillmusic`;
      const res = await fetchWithTimeout(url, 3000);
      if (res.ok) {
        const data = await res.json();
        return (data.data || []).map((item) => {
          const coverUrl = item.artwork?.['1000x1000'] || item.artwork?.['480x480'] || item.artwork?.['150x150'] || '';
          return {
            id: String(item.id),
            title: item.title || 'Unknown Title',
            artist: item.user?.name || 'Unknown Artist',
            artist_name: item.user?.name || 'Unknown Artist',
            album: item.title || 'Single',
            album_title: item.title || 'Single',
            duration: parseInt(item.duration || 180, 10),
            image_url: coverUrl,
            cover_url: coverUrl,
            image: coverUrl,
            artwork: coverUrl,
            audio_url: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=chillmusic`,
            source: 'audius',
          };
        });
      }
    } catch (err) {
      console.warn('Audius fetch failed or timed out:', err);
    }
    return [];
  };

  const fetchSaavn = async () => {
    const urls = [
      `https://saavn.me/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
      `https://jiosaavn-api-privatecv-101.vercel.app/search/songs?query=${encodeURIComponent(query)}`,
    ];

    const promises = urls.map(async (url) => {
      const res = await fetchWithTimeout(url, 3000);
      if (!res.ok) throw new Error('Not OK');
      const json = await res.json();
      const results = json.data?.results || (Array.isArray(json.data) ? json.data : []) || [];
      const tracks = results.map((item) => {
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

        const audioList = item.downloadUrl || item.url || item.media_preview_url || [];
        let audioUrl = '';
        if (Array.isArray(audioList) && audioList.length > 0) {
          const lastAudio = audioList[audioList.length - 1];
          audioUrl = typeof lastAudio === 'object' ? (lastAudio.url || lastAudio.link || '') : typeof lastAudio === 'string' ? lastAudio : '';
        } else if (typeof audioList === 'string') {
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
          id: String(item.id || Math.random()),
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
      }).filter((t) => t.audio_url);

      if (tracks.length === 0) throw new Error('No tracks');
      return tracks;
    });

    try {
      return await Promise.any(promises);
    } catch (err) {
      console.warn('All Saavn mirrors timed out or failed for query:', query);
      return [];
    }
  };

  try {
    const results = await Promise.allSettled([
      fetchSaavn(),
      fetchJamendo(),
      fetchAudius(),
      fetchiTunes(),
    ]);

    const saavnTracks = results[0].status === 'fulfilled' ? results[0].value : [];
    const jamendoTracks = results[1].status === 'fulfilled' ? results[1].value : [];
    const audiusTracks = results[2].status === 'fulfilled' ? results[2].value : [];
    const itunesTracks = results[3].status === 'fulfilled' ? results[3].value : [];

    // Put full-length mainstream music (Saavn) first, then Jamendo & Audius full songs, then iTunes previews
    const combined = [...saavnTracks, ...jamendoTracks, ...audiusTracks, ...itunesTracks];
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
          image_url: t.image_url,
          cover_url: t.image_url,
          image: t.image_url,
          source: t.source,
        });
      }
      if (t.album && !albumsMap.has(t.album)) {
        albumsMap.set(t.album, {
          id: t.album,
          title: t.album,
          artist: t.artist,
          image_url: t.image_url,
          cover_url: t.image_url,
          image: t.image_url,
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
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchPlaylists failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, 10);
  const cover = fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
  return [
    {
      id: `pl-${query}`,
      name: `${query} Top Hits`,
      title: `${query} Top Hits`,
      description: `Best ${query} songs curated for you`,
      image_url: cover,
      cover_url: cover,
      image: cover,
      artwork: cover,
      track_count: 20,
    },
    {
      id: `pl-chill-${query}`,
      name: `Chill ${query} Mix`,
      title: `Chill ${query} Mix`,
      description: `Relaxing ${query} vibes and melodies`,
      image_url: fallback.songs[1]?.image_url || cover,
      cover_url: fallback.songs[1]?.image_url || cover,
      image: fallback.songs[1]?.image_url || cover,
      artwork: fallback.songs[1]?.image_url || cover,
      track_count: 15,
    },
  ];
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
